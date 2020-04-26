// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, { Component, ChangeEvent, KeyboardEvent, createRef } from 'react';
import {Modal} from 'react-bootstrap';
import {defineMessages, FormattedMessage, injectIntl, IntlShape} from 'react-intl';

import Textbox from 'components/textbox';
import TextboxLinks from 'components/textbox/textbox_links';
import Constants, {ModalIdentifiers} from 'utils/constants';
import {isMobile} from 'utils/user_agent';
import {insertLineBreakFromKeyEvent, isKeyPressed, isUnhandledLineBreakKeyCombo, localizeMessage} from 'utils/utils.jsx';
import {t} from 'utils/i18n';
import { Channel } from 'mattermost-redux/src/types/channels';
import {Error} from 'mattermost-redux/types/errors';

const KeyCodes = Constants.KeyCodes;

const holders = defineMessages({
    error: {
        id: t('edit_channel_header_modal.error'),
        defaultMessage: 'This channel header is too long, please enter a shorter one',
    },
});

interface Props {
    intl: IntlShape;
    channel: Channel
    show: boolean;
    ctrlSend: boolean;
    shouldShowPreview: boolean;
    actions: {
        patchChannel(channelId: string, patch: Channel): Promise<{error: Error}>,        
        closeModal(modalId: string): void,
        setShowPreview(newState: boolean): void
    }
}

interface State {
    saving: boolean;
    header: string;
    serverError: Error | null,
}

class EditChannelHeaderModal extends Component<Props, State> {
    private textBoxRef = createRef<typeof Textbox>();

    constructor(props: Props) {
        super(props);

        this.state = {
            header: props.channel.header,
            saving: false,
            serverError: null,
        };
    }

    handleModalKeyDown = (e: KeyboardEvent<Modal>) => {
        if (isKeyPressed(e, KeyCodes.ESCAPE)) {
            this.hideModal();
        }
    }

    setShowPreview = (newState: boolean) => {
        this.props.actions.setShowPreview(newState);
    }

    handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({
            header: e.target.value,
        });
    }

    handleSave = async () => {
        const {header} = this.state;
        if (header === this.props.channel.header) {
            this.hideModal();
            return;
        }

        this.setState({saving: true});

        const {channel, actions} = this.props;
        const {error} = await actions.patchChannel(channel.id, {
            ...channel,
            header,
        });
        if (error) {
            this.setState({serverError: error, saving: false});
        } else {
            this.hideModal();
        }
    }

    hideModal = () => {
        this.props.actions.closeModal(ModalIdentifiers.EDIT_CHANNEL_HEADER);
    }

    focusTextbox = () => {
        if (!this.textBoxRef || !this.textBoxRef.current) {
            return;
        }
        this.textBoxRef.current!.getWrappedInstance().focus();
    }

    blurTextbox = () => {
        if (!this.textBoxRef || !this.textBoxRef.current) {
            return;
        }
        this.textBoxRef.current!.getWrappedInstance().blur();
    }

    handleEntering = () => {
        this.focusTextbox();
    }

    handleKeyDown = (e: KeyboardEvent) => {
        const {ctrlSend} = this.props;

        // listen for line break key combo and insert new line character
        if (isUnhandledLineBreakKeyCombo(e)) {
            this.setState({header: insertLineBreakFromKeyEvent(e)});
        } else if (ctrlSend && isKeyPressed(e, KeyCodes.ENTER) && e.ctrlKey === true) {
            this.handleKeyPress(e);
        }
    }

    handleKeyPress = (e: KeyboardEvent) => {
        const {ctrlSend} = this.props;
        if (!isMobile() && ((ctrlSend && e.ctrlKey) || !ctrlSend)) {
            if (isKeyPressed(e, KeyCodes.ENTER) && !e.shiftKey && !e.altKey) {
                e.preventDefault();
                this.blurTextbox();
                this.handleSave();
            }
        }
    }

    renderError = () => {
        const {serverError} = this.state;
        if (!serverError) {
            return null;
        }

        let errorMsg;
        if (serverError.server_error_id === 'model.channel.is_valid.header.app_error') {
            errorMsg = this.props.intl.formatMessage(holders.error);
        } else {
            errorMsg = serverError.message;
        }

        return (
            <div className='form-group has-error'>
                <br/>
                <label className='control-label'>
                    {errorMsg}
                </label>
            </div>
        );
    }

    render() {
        let headerTitle = null;
        if (this.props.channel.type === Constants.DM_CHANNEL) {
            headerTitle = (
                <FormattedMessage
                    id='edit_channel_header_modal.title_dm'
                    defaultMessage='Edit Header'
                />
            );
        } else {
            headerTitle = (
                <FormattedMessage
                    id='edit_channel_header_modal.title'
                    defaultMessage='Edit Header for {channel}'
                    values={{
                        channel: this.props.channel.display_name,
                    }}
                />
            );
        }

        return (
            <Modal
                dialogClassName='a11y__modal'
                show={this.props.show}
                keyboard={false}
                onKeyDown={this.handleModalKeyDown}
                onHide={this.hideModal}
                onEntering={this.handleEntering}
                onExited={this.hideModal}
                role='dialog'
                aria-labelledby='editChannelHeaderModalLabel'
            >
                <Modal.Header closeButton={true}>
                    <Modal.Title
                        componentClass='h1'
                        id='editChannelHeaderModalLabel'
                    >
                        {headerTitle}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body bsClass='modal-body edit-modal-body'>
                    <div>
                        <p>
                            <FormattedMessage
                                id='edit_channel_header_modal.description'
                                defaultMessage='Edit the text appearing next to the channel name in the channel header.'
                            />
                        </p>
                        <div className='textarea-wrapper'>
                            <Textbox
                                id='edit_textbox'
                                value={this.state.header}
                                onChange={this.handleChange}
                                onKeyPress={this.handleKeyPress}
                                supportsCommands={false}
                                useChannelMentions={false}
                                createMessage={localizeMessage('edit_channel_header.editHeader', 'Edit the Channel Header...')}
                                onKeyDown={this.handleKeyDown}
                                suggestionListStyle='bottom'
                                characterLimit={1024}
                                preview={this.props.shouldShowPreview}
                                ref={this.textBoxRef}
                            />
                        </div>
                        <div className='post-create-footer'>
                            <TextboxLinks
                                previewMessageLink={localizeMessage('edit_channel_header.previewHeader', 'Edit Header')}
                                characterLimit={1024}
                                showPreview={this.props.shouldShowPreview}
                                updatePreview={this.setShowPreview}
                                message={this.state.header}
                            />
                        </div>
                        <br/>
                        {this.renderError()}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type='button'
                        className='btn btn-link cancel-button'
                        onClick={this.hideModal}
                    >
                        <FormattedMessage
                            id='edit_channel_header_modal.cancel'
                            defaultMessage='Cancel'
                        />
                    </button>
                    <button
                        disabled={this.state.saving}
                        type='button'
                        className='btn btn-primary save-button'
                        onClick={this.handleSave}
                    >
                        <FormattedMessage
                            id='edit_channel_header_modal.save'
                            defaultMessage='Save'
                        />
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default injectIntl(EditChannelHeaderModal);
