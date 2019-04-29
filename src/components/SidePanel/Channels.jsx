import React, { Component } from "react";
import firebase from "../../firebase";
import { connect } from "react-redux";
import { setCurrentChannel, setPrivateChannel } from "../../redux/actions";
import { Menu, Icon, Modal, Form, Input, Button, Label } from "semantic-ui-react";

class Channels extends Component {
  state = {
    activeChannel: "",
    user: this.props.currentUser, // data of current user
    channel: null,
    channels: [],
    channelName: "",
    channelDetails: "",
    channelsRef: firebase.database().ref("channels"), // to create a new collection
    messagesRef: firebase.database().ref("messages"), // ref to messages collection
    typingRef: firebase.database().ref('typing'),
    notifications: [],
    modal: false,
    firstLoad: true
  };

  componentDidMount() {
    this.addListener();
  }

  componentWillUnmount() {
    this.removeListeners();
  }

  addListener = () => {
    // accamulating all channels from firebase into state
    let loadedChannels = [];
    this.state.channelsRef.on(
      "child_added", // on method listen to each new child added
      snap => {
        // snap callback gives possibility to get information of each child
        loadedChannels.push(snap.val()); // push each available channel to an arr
        this.setState({ channels: loadedChannels }, () =>
          this.setFirstChannel()
        ); /*loading channel by default */
        this.addNotificationListener(snap.key); // take Id of every channel added to firebase
      }
    );
  };

  addNotificationListener = channelId => {
    this.state.messagesRef.child(channelId).on("value", snap => {
      // to lissten to any message added
      if (this.state.channel) {
        //to show # of new messages on channel that user isn't on now
        this.handleNotifications(
          channelId,
          this.state.channel.id,
          this.state.notifications,
          snap
        );
      }
    });
  };

  handleNotifications = (channelId, currentChannelId, notifications, snap) => {
    let lastTotal = 0;

    let index = notifications.findIndex(  //method returns the index of the first element in the array that satisfies the provided testing function.
      // Otherwise, it returns -1, indicating no element passed the test.
      notification => notification.id === channelId // find index value then check it and return the index
    );

    if (index !== -1) {
      // if we have any info aboun the given channel
      if (channelId !== currentChannelId) {
        lastTotal = notifications[index].total; //if it's different channel to update last total

        if (snap.numChildren() - lastTotal > 0) {
          // to count all new messages

          notifications[index].count = snap.numChildren() - lastTotal;
        }
      }
      console.log('mess added');
      notifications[index].lastKnownTotal = snap.numChildren(); // new q-ty of messages for given channel
    } else {
      // ti it's a new channel will push a new obj to notificztion arr
      notifications.push({
        id: channelId,
        total: snap.numChildren(), // total q-ty of messages of the channel
        lastKnownTotal: snap.numChildren(), //same value as total
        count: 0 // will be updated
      });
    }

    this.setState({ notifications });
  };


  setFirstChannel = () => {
    // to set the first channel into store right after componentDidMount
    const { channels, firstLoad } = this.state;
    const firstChannel = channels[0];

    if (firstLoad && channels.length > 0) {
      this.props.setCurrentChannel(firstChannel);
      this.setActiveChannel(firstChannel);
      // to get notifications without switching channel first
      this.setState({ channel: firstChannel });
    }
    this.setState({ firstLoad: false });
  };

  addChannel = () => {
    // function for creation a new channel
    const { channelsRef, channelName, channelDetails, user } = this.state;
    const key = channelsRef.push().key; // to retrieve the unique key
    console.log("key", key);

    const newChannel = {
      id: key,
      name: channelName,
      details: channelDetails,
      createdBy: {
        name: user.displayName,
        avatar: user.photoURL
      }
    };

    channelsRef
      .child(key) // to create a new child with the id === key
      .update(newChannel) // adding a new channel
      .then(() => {
        this.setState({ channelName: "", channelDetails: "" });
        this.closeModal();
        console.log("channel added");
      })
      .catch(err => {
        console.error(err);
      });
  };

  getNotificationCount = channel => {
    // check curr channel and display # of notification
    let count = 0;
    this.state.notifications.forEach(notification => {
      if (notification.id === channel.id) {
        count = notification.count;
      }
    });
    if (count > 0) return count;
  };

  displayChannels = (channels) => //mapping all existing channels at sidebar 
    channels.length > 0 &&
    channels.map(channel => (
      <Menu.Item
        key={channel.id}
        onClick={() => this.changeChannel(channel)}
        name={channel.name}
        style={{ opacity: 0.7 }}
        active={this.state.activeChannel === channel.id}
      >
        {this.getNotificationCount(channel) && (
          <Label color="red">{this.getNotificationCount(channel)}</Label>
        )}
        # {channel.name}
      </Menu.Item>
    ));

  changeChannel = channel => {
    // take a channel and puts it's data to the store
    this.setActiveChannel(channel);
    this.state.typingRef
      .child(this.state.channel.id)
      .child(this.state.user.uid)
      .remove();
    this.clearNotifications();
    this.props.setCurrentChannel(channel);
    this.props.setPrivateChannel(false);
    this.setState({ channel }); // update the channel value in the state
  };

  clearNotifications = () => {
    // to clear notification on curr channel
    // will remove any notifications for a channel we are currently on
    let index = this.state.notifications.findIndex(
      notification => notification.id === this.state.channel.id
    ); // check id of current channel and notifications id. if same make as 'readed'

    if (index !== -1) {
      //if it finds positive index
      let updateNotifications = [...this.state.notifications]; // copy state
      updateNotifications[index].total = this.state.notifications[
        index
      ].lastKnownTotal; // select based on given index, grab total and update
      updateNotifications[index].count = 0; //set to 0
      this.setState({
        notifications: updateNotifications
      });
    }
  };

  setActiveChannel = channel => {
    // define id of channel which is active right now
    this.setState({ activeChannel: channel.id });
  };

  handleChange = event => {
    // getting value from inputs
    this.setState({ [event.target.name]: event.target.value });
  };

  handleSubmit = event => {
    // submit and adding function
    event.preventDefault();
    if (this.isFormValid(this.state)) {
      this.addChannel();
    }
  };

  isFormValid = ({ channelName, channelDetails }) =>
    channelName && channelDetails; //form validation

  openModal = () => this.setState({ modal: true });

  closeModal = () => this.setState({ modal: false });

  removeListeners = () => {
    this.state.channelsRef.off(); // turning off the reffs and childrefs
    this.state.channels.forEach(channel => {
      this.state.messagesRef.child(channel.id).off();
    })
  };

  render() {
    const { channels, modal } = this.state;

    return (
      <React.Fragment>
        {" "}
        {/*good way to return multiple React components */}
        <Menu.Menu className="menu">
          <Menu.Item>
            <span>
              <Icon name="exchange" />
              CHANNELS
            </span>
            ({channels.length})<Icon name="add" onClick={this.openModal} />
          </Menu.Item>
          {this.displayChannels(channels)}
        </Menu.Menu>
        {/* Add Channel Modal */}
        <Modal basic open={modal} onClose={this.closeModal}>
          <Modal.Header>Add a Channel</Modal.Header>
          <Modal.Content>
            <Form onSubmit={this.handleSubmit}>
              <Form.Field>
                <Input
                  fluid
                  label="Name of Channel"
                  name="channelName"
                  onChange={this.handleChange}
                />
              </Form.Field>

              <Form.Field>
                <Input
                  fluid
                  label="About the Channel"
                  name="channelDetails"
                  onChange={this.handleChange}
                />
              </Form.Field>
            </Form>
          </Modal.Content>

          <Modal.Actions>
            <Button color="green" inverted onClick={this.handleSubmit}>
              <Icon name="checkmark" /> Add
            </Button>
            <Button color="red" inverted onClick={this.closeModal}>
              <Icon name="remove" /> Cancel
            </Button>
          </Modal.Actions>
        </Modal>
      </React.Fragment>
    );
  }
}

export default connect(
  null,
  { setCurrentChannel, setPrivateChannel }
)(Channels);
