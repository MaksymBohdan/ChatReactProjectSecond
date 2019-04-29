import React, { Component } from "react";
import { connect } from "react-redux";
import firebase from "../../firebase";
import { setCurrentChannel, setPrivateChannel } from "../../redux/actions";
import { Menu, Icon } from "semantic-ui-react";

class Starred extends Component {
  // to show favorive channels
  state = {
    user: this.props.currentUser,
    usersRef: firebase.database().ref("users"),
    activeChannel: "",
    starredChannels: []
  };

  componentDidMount() {
    if (this.state.user) {
      this.addListeners(this.state.user.uid);
    }
  }

  componentWillUnmount() {
    this.removeListener();
  }

  removeListener = () => {
    this.state.usersRef.child(`${this.state.user.uid}/starred`).off()
  };

  addListeners = userId => {
    this.state.usersRef
      .child(userId) // connect to current user
      .child("starred") // listen to any changes in the starred prop of currne user
      .on("child_added", snap => {
        // listen to user stars a new channel
        const starredChannel = { id: snap.key, ...snap.val() };
        // to add a channel with id to state
        this.setState({
          starredChannels: [...this.state.starredChannels, starredChannel]
        });
      });

    this.state.usersRef
      .child(userId)
      .child("starred")
      .on("child_removed", snap => {
        //to remove a channel by id from state
        const channelToRemove = { id: snap.key, ...snap.val() };
        const filteredChannels = this.state.starredChannels.filter(channel => {
          return channel.id !== channelToRemove.id;
        });
        this.setState({
          starredChannels: filteredChannels
        })
      });
  };

  setActiveChannel = channel => {
    // define id of channel which is active right now
    this.setState({ activeChannel: channel.id });
  };

  changeChannel = channel => {
    // take a channel and puts it's data to the store
    this.setActiveChannel(channel);
    this.props.setCurrentChannel(channel);
    this.props.setPrivateChannel(false);
  };

  displayChannels = (
    starredChannels //mapping all existing channels at sidebar
  ) =>
    starredChannels.length > 0 &&
    starredChannels.map(channel => (
      <Menu.Item
        key={channel.id}
        onClick={() => this.changeChannel(channel)}
        name={channel.name}
        style={{ opacity: 0.7 }}
        active={this.state.activeChannel === channel.id}
      >
        # {channel.name}
      </Menu.Item>
    ));

  render() {
    const { starredChannels } = this.state;
    return (
      <Menu.Menu className="menu">
        <Menu.Item>
          <span>
            <Icon name="star" />
            STARRED
          </span>
          ({starredChannels.length})
        </Menu.Item>
        {this.displayChannels(starredChannels)}
      </Menu.Menu>
    );
  }
}

export default connect(
  null,
  { setCurrentChannel, setPrivateChannel }
)(Starred);
