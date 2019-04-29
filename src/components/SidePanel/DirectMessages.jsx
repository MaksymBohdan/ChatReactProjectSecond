import React, { Component } from "react";
import firebase from "../../firebase";
import { Menu, Icon } from "semantic-ui-react";
import { setCurrentChannel, setPrivateChannel } from "../../redux/actions/";
import { connect } from "react-redux";

class DirectMessages extends Component {
  state = {
    activeChannel: "", // active channel for direct messages
    user: this.props.currentUser, // info of the curr. user
    users: [],
    userRef: firebase.database().ref("users"), // ref to users in firebase
    connectedRef: firebase.database().ref(".info/connected"), // ref to give information about user's connection
    presenceRef: firebase.database().ref("presence")
  };

  componentDidMount() {
    if (this.state.user) {
      //check if there is a user in a state and call a fn then
      this.addListeners(this.state.user.uid);
    }
  }

  componentWillUnmount() {
    this.removeListeners();
  }

  removeListeners = () => {
    this.state.userRef.off();
    this.state.presenceRef.off();
    this.state.connectedRef.off();
  };

  addListeners = currentUserUid => {
    let loadedUsers = [];
    this.state.userRef.on("child_added", snap => {
      if (currentUserUid !== snap.key) {
        // in order to not include ourself to user arr
        let user = snap.val(); // getting obj of particular user
        user["uid"] = snap.key; // adding few new properties
        user["status"] = "offline"; // initially set ofline
        loadedUsers.push(user);
        this.setState({ users: loadedUsers });
      }
    });

    this.state.connectedRef.on("value", snap => {
      // listener on user's connection changing . If there is changing f-n updates the presence collection
      if (snap.val() === true) {
        const ref = this.state.presenceRef.child(currentUserUid); // creation of a new child
        ref.set(true); // setting the value to the child
        ref.onDisconnect().remove(err => {
          // in case if the user disconect from the app we remove the property
          if (err !== null) console.err(err);
        });
      }
    });

    this.state.presenceRef.on("child_added", snap => {
      // to track user's online status
      if (currentUserUid !== snap.key) {
        this.addStatusToUser(snap.key);
      }
    });

    this.state.presenceRef.on("child_removed", snap => {
      // to track user;s status in case or user has gone
      if (currentUserUid !== snap.key) {
        this.addStatusToUser(snap.key, false);
      }
    });
  };

  addStatusToUser = (userId, connected = true) => {
    // to add a particular status to an user
    const updatedUsers = this.state.users.reduce((acc, user) => {
      if (user.uid === userId) {
        user["status"] = `${connected ? "online" : "offline"}`; //assigning off/on-line status
      }
      return acc.concat(user);
    }, []);
    this.setState({ users: updatedUsers });
  };

  isUserOnline = user => user.status === "online";

  changeChannel = user => {
    // to set curr channel to store
    const channelId = this.getChannelId(user.uid); // get id channel
    const channelData = {
      // direct channel data
      id: channelId,
      name: user.name
    };
    this.props.setCurrentChannel(channelData); // setting to the store
    this.props.setPrivateChannel(true); // setting bool private/public channel
    this.setActiveChannel(user.uid);
  };

  getChannelId = userId => {
    // here we compare our id with clicked direct message channel id
    const currentUserId = this.state.user.uid;
    // to create unique id identifier for every direc mess channel
    return userId < currentUserId
      ? `${userId}/${currentUserId}`
      : `${currentUserId}/${userId}`;
  };

  setActiveChannel = userId => { // to set the curr active direct channel
    this.setState({ activeChannel: userId });
  };


  render() {
    const { users, activeChannel } = this.state;
    return (
      <Menu.Menu className="menu">
        <Menu.Item>
          <span>
            <Icon name="mail" /> DIRECT MESSAGES
          </span>{" "}
          ({users.length})
        </Menu.Item>
        {users.map(user => (
          <Menu.Item
            key={user.uid}
            active={user.uid === activeChannel}
            onClick={() => this.changeChannel(user)}
            style={{ opacity: 0.7, fontStyle: "italic" }}
          >
            <Icon
              name="circle"
              color={this.isUserOnline(user) ? "green" : "red"}
            />
            @ {user.name}
          </Menu.Item>
        ))}
      </Menu.Menu>
    );
  }
}

export default connect(
  null,
  { setCurrentChannel, setPrivateChannel }
)(DirectMessages);
