import React, { Component } from 'react';
import uuidv4 from "uuid/v4";
import { Segment, Button, Input } from "semantic-ui-react";
import firebase from '../../firebase';
import { Picker, emojiIndex } from 'emoji-mart';
import 'emoji-mart/css/emoji-mart.css';
import FileModal from './FileModal'
import ProgressBar from './ProgressBar';

class MessagesForm extends Component {
  state = {
    storageRef: firebase.storage().ref(), // reference to the firestorage
    typingRef: firebase.database().ref('typing'),
    uploadTask: null,
    uploadState: "",
    percentUploaded: 0,
    message: "",
    channel: this.props.currentChannel,
    user: this.props.currentUser,
    loading: false,
    errors: [],
    modal: false,
    emojiPicker: false,
  };

  componentWillUnmount() {
    if (this.state.uploadTask !== null) {
      this.state.uploadTask.cancel();
      this.setState({ uploadTask: null })
    }
  }

  openModal = () => this.setState({ modal: true })

  closeModal = () => this.setState({ modal: false })

  handleChange = event => {
    this.setState({ [event.target.name]: event.target.value });
  };

  handleKeyDown = event => { // to set user's name which currently typing to a firebase
    if (event.ctrlKey && event.keyCode === 13) { // to add combo shortcuts
      this.sendMessage()
    }

    const { message, typingRef, channel, user } = this.state;
    if (message) {
      typingRef
        .child(channel.id)
        .child(user.uid)
        .set(user.displayName);
    } else {
      typingRef
        .child(channel.id)
        .child(user.uid)
        .remove();
    }
  };

  handleTogglePicker = () => {
    this.setState(prev => ({
      emojiPicker: !prev.emojiPicker
    })
    )
  };
  handleAddEmoji = emoji => {
    const oldMessage = this.state.message;
    const newMessage = this.colonToUnicode(` ${oldMessage} ${emoji.colons} `)
    this.setState({ message: newMessage, emojiPicker: false })
    setTimeout(() => this.messageInputRef.focus(), 0); // to put focus on input after emoji added
  };

  colonToUnicode = message => { // takes massage and transform to unicode
    return message.replace(/:[A-Za-z0-9_+-]+:/g, x => {
      x = x.replace(/:/g, "");
      let emoji = emojiIndex.emojis[x];
      if (typeof emoji !== "undefined") {
        let unicode = emoji.native;
        if (typeof unicode !== "undefined") {
          return unicode;
        }
      }
      x = ":" + x + ":";
      return x;
    });
  };

  createMessage = (fileUrl = null) => { // create a single message and return the obj of it
    const message = {
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      user: {
        id: this.state.user.uid,
        name: this.state.user.displayName,
        avatar: this.state.user.photoURL
      },
    };

    if (fileUrl !== null) { // checking file or text message and creating property accordingly
      message['image'] = fileUrl;
    } else {
      message['content'] = this.state.message
    }
    return message;
  };

  sendMessage = () => {
    const { getMessagesRef } = this.props;
    const { message, channel, user, typingRef } = this.state;

    if (message) {   // send message
      this.setState({ loading: true });
      getMessagesRef()
        .child(channel.id) // to make same id as we have in channels
        .push() // to push onto the messages ref
        .set(this.createMessage())
        .then(() => {
          this.setState({ loading: false, message: "", errors: [] });
          typingRef
            .child(channel.id)
            .child(user.uid)
            .remove();
        })
        .catch(err => {
          console.error(err);
          this.setState({
            loading: false,
            errors: this.state.errors.concat(err)
          });
        });
    } else {
      this.setState({
        errors: this.state.errors.concat({ message: "Add a message" })
      });
    }
  };

  uploadFile = (file, metadata) => {
    const pathToUpload = this.state.channel.id; // path to which message will be uploaded
    const ref = this.props.getMessagesRef(); // ref to messages in firebase
    const filePath = `${this.getPath()}/${uuidv4()}.jpg`; // file path variable

    this.setState({
      uploadState: "uploading", // set to upload string as file has being uploaded
      uploadTask: this.state.storageRef
        .child(filePath) // new child in firestorage
        .put(file, metadata) // a file by itsefl
    },
      () => {
        this.state.uploadTask.on('state_changed', snap => { // once apload is changed from null we listen on state change
          const percentUploaded = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);  // persantage od uploading of file
          this.setState({ percentUploaded });
        }, // setting of current uploaded % to state
          err => {
            console.log(err); // second parametr of on method to catch err
            this.setState({
              errors: this.state.errors.concat(err),
              uploadState: 'error',
              uploadTask: null,
            })
          },
          () => { // third parametr of on method to
            this.state.uploadTask.snapshot.ref
              .getDownloadURL() // firebase method Asynchronously retrieves a long lived download URL with a revokable token
              .then(downloadUrl => {
                console.log('downloadUrl', downloadUrl);
                this.sendFileMessage(downloadUrl, ref, pathToUpload);
              })
              .catch(err => {
                console.log(err);
                this.setState({
                  errors: this.state.errors.concat(err),
                  uploadState: 'error',
                  uploadTask: null,
                })
              })
          }
        )
      }
    )
  }

  getPath = () => { // which path should be used wheather it's private or public
    if (this.props.isPrivateChannel) {
      return `chat/private/${this.state.channel.id}`;
    } else {
      return 'chat/public'
    }
  }

  sendFileMessage = (fileUrl, ref, pathToUpload) => { // to send a message with file
    ref.child(pathToUpload) // creating a child with channel id
      .push()
      .set(this.createMessage(fileUrl)) // put created message
      .then(() => {
        this.setState({ uploadState: 'done' })
      })
      .catch(err => {
        console.log(err);
        this.setState({
          errors: this.state.errors.concat(err)
        })
      })
  }


  render() {
    const { errors, message, loading, modal, percentUploaded, uploadState, emojiPicker } = this.state;

    return (
      <Segment className="message__form">
        {emojiPicker && (
          <Picker
            set="apple"
            onSelect={this.handleAddEmoji}
            className="emojipicker"
            title="Pick your emoji"
            emoji="point_up"
          />
        )}
        <Input
          fluid
          name="message"
          onChange={this.handleChange}
          onKeyDown={this.handleKeyDown}
          value={message}
          ref={node => (this.messageInputRef = node)} // using to keep input
          style={{ marginBottom: "0.7em" }}
          label={
            <Button
              icon={emojiPicker ? 'close' : 'add'}
              content={emojiPicker ? "Close" : null}
              onClick={this.handleTogglePicker}
            />
          }
          labelPosition="left"
          className={
            errors.some(error => error.message.includes("message"))
              ? "error"
              : ""
          }
          placeholder="Write your message"
        />
        <Button.Group icon widths="2">
          <Button
            onClick={this.sendMessage}
            disabled={loading}
            color="orange"
            content="Add Reply"
            labelPosition="left"
            icon="edit"
          />
          <Button
            color="teal"
            disabled={uploadState === 'uploading'}
            onClick={this.openModal}
            content="Upload Media"
            labelPosition="right"
            icon="cloud upload"
          />
        </Button.Group>
        <FileModal
          modal={modal}
          closeModal={this.closeModal}
          uploadFile={this.uploadFile}
        />
        <ProgressBar
          uploadState={uploadState}
          percentUploaded={percentUploaded}
        />
      </Segment>
    );
  }
}

export default MessagesForm;
