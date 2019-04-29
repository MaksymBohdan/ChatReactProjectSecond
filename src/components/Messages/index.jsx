import React, { Component } from "react";
import { Segment, Comment } from "semantic-ui-react";
import firebase from "../../firebase";
import { connect } from "react-redux";
import { setUserPosts } from "../../redux/actions";
import MessagesHeader from "./MessagesHeader";
import MessagesForm from "./MessagesForm";
import Message from "./Message";
import Typing from './Typing';
import Skeleton from './Skeleton';

/*A DatabaseReference is a starting point for all database operations. This allows you to read, write, and create new DatabaseReferences.
A DataSnapshot is an efficiently-generated immutable copy of the data at a Firebase Location. They cannot be modified and will never change.*/
class Messages extends Component {
  state = {
    isPrivateChannel: this.props.isPrivateChannel, // value of private channel
    privateMessagesRef: firebase.database().ref("privateMessages"), // ref to private messages
    messagesRef: firebase.database().ref("messages"), // ref to firebase messages
    messages: [],
    numUniqueUsers: "",
    messagesLoading: true,
    channel: this.props.currentChannel,
    isChannelStarred: false,
    user: this.props.currentUser,
    usersRef: firebase.database().ref("users"),
    searchTerm: "",
    searchLoading: false,
    searchResult: [],
    typingRef: firebase.database().ref('typing'),
    typingUsers: [],
    connectedRef: firebase.database().ref(".info/connected"),
    listeners: [],
  };

  componentDidMount() {
    const { channel, user, listeners } = this.state;
    if (channel && user) {
      this.removeListeners(listeners);
      this.addListeners(channel.id);
      this.addUserStarsListener(channel.id, user.uid);
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) { // to scroll to the bottom of dialog after each new message
    if (this.messagesEnd) {
      this.scrollToBottom();
    }
  }

  componentWillUnmount() {
    this.removeListeners(this.state.listeners);
    this.state.connectedRef.off();
  }

  removeListeners = listeners => {
    listeners.forEach(listener => {
      listener.ref.child(listener.id).off(listener.event);
    })
  };

  addToListeners = (id, ref, event) => {
    const index = this.state.listeners.findIndex(listener => {
      return listener.id === id && listener.ref === ref && listener.event === event;
    });
    if (index === -1) {
      const newListener = { id, ref, event };
      this.setState({ listeners: this.state.listeners.concat(newListener) })
    }
  };

  scrollToBottom = () => {
    this.messagesEnd.scrollIntoView({ behavior: 'smooth' })
  };

  addListeners = channelId => {
    this.addMessageListener(channelId); // the listener for addMessages func
    this.addTypingListeners(channelId)
  };

  addTypingListeners = channelId => {
    let typingUsers = []; // to add name of user which is currently typing
    this.state.typingRef.child(channelId).on("child_added", snap => {
      if (snap.key !== this.state.user.uid) {
        typingUsers = typingUsers.concat({
          id: snap.key,
          name: snap.val()
        });
        this.setState({ typingUsers });
      }
    });
    this.addToListeners(channelId, this.state.typingRef, 'child_added');

    //to remove a user which isn't typing
    this.state.typingRef.child(channelId).on("child_removed", snap => {
      const index = typingUsers.findIndex(user => user.id === snap.key);
      if (index !== -1) {
        typingUsers = typingUsers.filter(user => user.id !== snap.key);
        this.setState({ typingUsers });
      }
    });
    this.addToListeners(channelId, this.state.typingRef, 'child_removed');

    this.state.connectedRef.on("value", snap => {  // to stop showing typing on disconnect
      if (snap.val() === true) {
        this.state.typingRef
          .child(channelId)
          .child(this.state.user.uid)
          .onDisconnect()
          .remove(err => {
            if (err !== null) {
              console.error(err);
            }
          });
      }
    });
  };

  addUserStarsListener = (channelId, userId) => {
    this.state.usersRef
      .child(userId)
      .child("starred") // to get child inside prev child
      /* When you use once, you're asking for a single event of the indicated type.
       So once("child_added" fires a single child_added event.
       The fact that your on fires multiple times */
      .once("value") // use once method to get it's value
      .then(data => {
        // refet to particular value
        if (data.val() !== null) {
          // check if there is a value
          // console.log('data.val', data.val())
          const channelIds = Object.keys(data.val()); // gettinf an arr of all starred channel by particular user
          const prevStarred = channelIds.includes(channelId); // check if givven id presend
          this.setState({ isChannelStarred: prevStarred }); // if yes than true
        }
      });
  };

  addMessageListener = channelId => {
    let loadedMessages = []; // arr of all messages of the channel from firebase
    const ref = this.getMessagesRef();

    ref.child(channelId).on('value', snap => {
      //to display empty dialog
      if (!snap.val()) this.setState({ messagesLoading: false })
    })

    ref
      .child(channelId) // connect to current channel
      .on("child_added", snap => {
        // to retrieve snap of all added childes of the current channel. Typically used when retrieving a list of items from the database
        loadedMessages.push(snap.val()); // save them into arr loadedMessages
        this.setState({
          messages: loadedMessages,
          messagesLoading: false
        });
        this.countUniqueUsers(loadedMessages);
        this.countUserPosts(loadedMessages);
      });
    this.addToListeners(channelId, ref, 'child_added');
  };

  countUniqueUsers = messages => {
    // arr of all messages as a param
    const uniqueUsers = messages.reduce((acc, message) => {
      if (!acc.includes(message.user.name)) {
        acc.push(message.user.name); // pushing only unique names
      }
      return acc;
    }, []);
    const plural = uniqueUsers.length > 1 || uniqueUsers.length === 0; // to check it's needed to use plural fort of 'user'
    const numUniqueUsers = `${uniqueUsers.length} user${plural ? "s" : ""}`;
    this.setState({ numUniqueUsers });
  };

  countUserPosts = messages => {
    // to count how many posts was made by each user
    let userPosts = messages.reduce((acc, message) => {
      if (message.user.name in acc) {
        // to check if there is a property within an acc with the name of curren user
        acc[message.user.name].count += 1; // create and increment a property
      } else {
        acc[message.user.name] = {
          // if there is only one message
          avatar: message.user.avatar,
          count: 1
        };
      }
      return acc;
    }, {});
    this.props.setUserPosts(userPosts);
  };

  displayMessages = (messages // to render all messages as a Message component
  ) => {
    return messages.length > 0 && messages.map(message => (<Message key={message.timestamp} message={message} user={this.state.user} />))
  };

  displayChannelName = channel => {
    return channel
      ? `${this.state.privateChannel ? "@" : "#"}${channel.name}`
      : ""; // to display a channel name
  };

  displayTypingUsers = users =>
    users.length > 0 &&
    users.map(user => (
      <div
        style={{ display: "flex", alignItems: "center", marginBottom: "0.2em" }}
        key={user.id}
      >
        <span className="user__typing">{user.name} is typing</span> <Typing />
      </div>
    ));


  handleSearchChange = event => {
    // on search start
    this.setState(
      {
        searchTerm: event.target.value,
        searchLoading: true
      },
      () => this.handleSearchMessages()
    );
  };

  handleSearchMessages = () => {
    // search logic
    const channelMessages = [...this.state.messages]; // cloning to not mutate
    const regex = new RegExp(this.state.searchTerm, "gi"); // regular expression globaly and upp/low-case
    const searchResult = channelMessages.reduce((acc, message) => {
      // match() method retrieves the result of matching a string against a regular expression.
      if (
        (message.content && message.content.match(regex)) ||
        message.user.name.match(regex)
      ) {
        acc.push(message);
      }
      return acc;
    }, []);
    this.setState({ searchResult });
    setTimeout(() => this.setState({ searchLoading: false }), 1000); // loading displaying ends in 1 sec
  };

  getMessagesRef = () => {
    // to assign a derictory depending on private or public message
    const { messagesRef, privateMessagesRef, isPrivateChannel } = this.state;

    return isPrivateChannel ? privateMessagesRef : messagesRef;
  };

  handleStar = () => {
    // to toggle star
    this.setState(
      prevState => ({ isChannelStarred: !prevState.isChannelStarred }),
      () => this.starChannel()
    );
  };

  starChannel = () => {
    if (this.state.isChannelStarred) {
      // to select a child and add starred property
      this.state.usersRef.child(`${this.state.user.uid}/starred`).update({
        [this.state.channel.id]: {
          // if od channel and related data
          name: this.state.channel.name,
          details: this.state.channel.details,
          createdBy: {
            name: this.state.channel.createdBy.name,
            avatar: this.state.channel.createdBy.avatar
          }
        }
      });
    } else {
      this.state.usersRef
        .child(`${this.state.user.uid}/starred`)
        .child(this.state.channel.id)
        .remove(err => {
          // if unstarred to remove the child
          if (err !== null) {
            console.error(err);
          }
        });
    }
  };

  displayMessagesSkeleton = loading => (
    loading ? (
      <React.Fragment>
        {/*to use an arr constructore to imitate 10 elements */}
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} />
        ))}
      </React.Fragment>
    ) : null
  );

  render() {
    const { messagesRef, messages, channel, user, numUniqueUsers, searchTerm, searchResult, searchLoading,
      privateChannel, isChannelStarred, typingUsers, messagesLoading } = this.state;
    return (
      <React.Fragment>
        <MessagesHeader
          channelName={this.displayChannelName(channel)}
          numUniqueUsers={numUniqueUsers}
          handleSearchChange={this.handleSearchChange}
          searchLoading={searchLoading}
          isPrivateChannel={privateChannel}
          handleStar={this.handleStar}
          isChannelStarred={isChannelStarred}
        />

        <Segment>
          <Comment.Group className="messages">
            {this.displayMessagesSkeleton(messagesLoading)}
            {searchTerm
              ? this.displayMessages(searchResult)
              : this.displayMessages(messages)}
            {this.displayTypingUsers(typingUsers)}
            <div ref={node => (this.messagesEnd = node)}> </div>
          </Comment.Group>
        </Segment>

        <MessagesForm
          messagesRef={messagesRef}
          currentChannel={channel}
          currentUser={user}
          isPrivateChannel={privateChannel}
          getMessagesRef={this.getMessagesRef}
        />
      </React.Fragment>
    );
  }
}

export default connect(
  null,
  { setUserPosts }
)(Messages);
