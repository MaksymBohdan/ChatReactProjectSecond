import React, { Component } from 'react';
import firebase from '../../firebase';
import { Grid, Header, Icon, Dropdown, Image, Modal, Input, Button } from "semantic-ui-react";
import AvatarEditor from 'react-avatar-editor';

class UserPanel extends Component {
  state = {
    user: this.props.currentUser,  // receiving props from SidePanel
    modal: false,
    previewImage: '',
    croppedImage: '',
    uploadedCroppedImage: '',
    blob: '',
    storageRef: firebase.storage().ref(),
    userRef: firebase.auth().currentUser, // alternative way to get current user info
    usersRef: firebase.database().ref('users'),
    metadata: { // to upload all images as jpeg file
      contentType: 'image/jpeg'
    }
  };

  openModal = () => {
    return this.setState({ modal: true });
  };

  closeModal = () => {
    return this.setState({ modal: false });
  };

  dropdownOptions = () => [ // data for dropdown option
    {
      key: "user",
      text: (
        <span>
          Signed in as <strong>{this.state.user.displayName}</strong>
        </span>
      ),
      disabled: true
    },
    {
      key: "avatar",
      text: <span onClick={this.openModal}>Change Avatar</span>
    },
    {
      key: "signout",
      text: <span onClick={this.handleSignOut}>Sign Out</span>
    }
  ];

  handleChange = event => { // get the image and set url into state
    const file = event.target.files[0];
    const reader = new FileReader();// web applications asynchronously read the contents of files

    if (file) {
      console.log('handleChange works')
      reader.readAsDataURL(file);
      reader.addEventListener("load", () => {
        this.setState({ previewImage: reader.result });
      });
    }
  };

  handleCropImage = () => {
    if (this.avatarEditor) {
      this.avatarEditor.getImageScaledToCanvas() // will do the cropping to the image
        .toBlob(blob => { //method creates a Blob object representing the image contained in the canvas;
          let imageUrl = URL.createObjectURL(blob); // create image Url
          console.log('imageUrl', imageUrl);
          console.log('blob', blob);
          this.setState({
            croppedImage: imageUrl,
            blob
          })
        })
    }
  };

  uploadCroppedImage = () => { // uploaded file to the storage as an image blob
    const { userRef, storageRef, blob, metadata } = this.state;
    storageRef
      .child(`avatar/users/${userRef.uid}`)
      .put(blob, metadata) // to put the image into store
      .then(snap => { // get snap from the uploaded img
        snap.ref.getDownloadURL().then(downloadURL => { // get url of uploaded img and set to state
          this.setState({ uploadedCroppedImage: downloadURL }, () =>
            this.changeAvatar())
        })
      })
  };

  changeAvatar = () => { // call to update profile img
    this.state.userRef // to udate user info in auth account
      .updateProfile({
        photoURL: this.state.uploadedCroppedImage
      })
      .then(() => {
        console.log('PhotoURL updated');
        this.closeModal()
      })
      .catch(err => {
        console.log(err)
      });

    this.state.usersRef // to update user info in a storage
      .child(this.state.user.uid)
      .update({ avatar: this.state.uploadedCroppedImage })
      .then(() => {
        console.log('user avatar updated')
      })
      .catch(err => {
        console.error(err);
      })
  };

  handleSignOut = () => {  //user signout func
    firebase
      .auth()
      .signOut()
      .then(() => console.log('signed out'))
  }

  render() {
    const { user, modal, previewImage, croppedImage } = this.state;
    const { primaryColor } = this.props
    return (
      <Grid style={{ background: primaryColor }}>
        <Grid.Column>
          <Grid.Row style={{ padding: "1.2em", margin: 0 }}>
            {/* App Header */}
            <Header inverted floated="left" as="h2">
              <Icon name="code" />
              <Header.Content>DevChat</Header.Content>
            </Header>
          </Grid.Row>
          {/* User Dropdown  */}
          <Header style={{ padding: "0.25em" }} as="h4" inverted>
            <Dropdown
              trigger={
                <span>
                  <Image style={{ marginLeft: "1.2em" }} src={user.photoURL} avatar />
                  {user.displayName}
                </span>}
              options={this.dropdownOptions()}
            />
          </Header>
          <Modal basic open={modal} onClose={this.closeModal}>
            <Modal.Header>Change Avatar</Modal.Header>
            <Modal.Content>
              <Input
                onChange={this.handleChange}
                fluid
                type="file"
                label="New Avatar"
                name="previewImage"
              />
              <Grid centered stackable columns={2}>
                <Grid.Row centered>
                  <Grid.Column className="ui center aligned grid">
                    {previewImage && (
                      <AvatarEditor
                        ref={node => (this.avatarEditor = node)} // link to DOM element
                        image={previewImage}
                        width={120}
                        height={120}
                        border={50}
                        scale={1.2}
                      />
                    )}
                  </Grid.Column>
                  <Grid.Column>
                    {croppedImage && (
                      <Image
                        style={{ margin: '3.5 auto' }}
                        width={100}
                        heigth={100}
                        src={croppedImage}
                      />
                    )}
                  </Grid.Column>
                </Grid.Row>
              </Grid>
            </Modal.Content>
            <Modal.Actions>
              {croppedImage && <Button color="green" inverted onClick={this.uploadCroppedImage}>
                <Icon name="save" /> Change Avatar
              </Button>}
              <Button color="green" inverted onClick={this.handleCropImage}>
                <Icon name="image" /> Preview
              </Button>
              <Button color="red" inverted onClick={this.closeModal}>
                <Icon name="remove" /> Cancel
              </Button>
            </Modal.Actions>
          </Modal>
        </Grid.Column>
      </Grid>
    );
  }
}

export default UserPanel;
