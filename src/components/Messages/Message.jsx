import React from 'react';
import moment from "moment";
import { Comment, Image } from "semantic-ui-react";

const isOwnMessage = (message, user) => { // special class of the user currently useing chat
  return message.user.id === user.uid ? "message__self" : "";
};

const timeFromNow = timestamp => moment(timestamp).fromNow(); // momrnt js to change time style

const isImage = message => { // checking message contains the text or img
  return message.hasOwnProperty('image') && !message.hasOwnProperty('content')
}

const Message = ({ message, user }) => { // component of single message
  return (
    <Comment>
      <Comment.Avatar src={message.user.avatar} />
      <Comment.Content className={isOwnMessage(message, user)}>
        <Comment.Author as="a">{message.user.name}</Comment.Author>
        <Comment.Metadata>{timeFromNow(message.timestamp)}</Comment.Metadata>
        {isImage(message) ?
          <Image src={message.image} className="message__image" /> :
          <Comment.Text>{message.content}</Comment.Text>
        }
      </Comment.Content>
    </Comment>
  );
};

export default Message;