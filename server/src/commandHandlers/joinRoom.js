import defaultCardConfig from '../defaultCardConfig';

/**
 * A user joins a room.
 *
 * Two scenarios:  either the room exists already or the room with the given id does not exist yet.
 *
 * If the room does not yet exist, an additional "roomCreated" event is produced.
 * Produces also a "roomJoined" event (which contains the room state).
 * Produces also events for additional properties if they are preset "usernameSet", "emailSet", "excludedFromEstimations".
 *
 */
const joinRoomCommandHandler = {
  canCreateRoom: true,
  skipUserIdRoomCheck: true, // will not check whether userId is part of the room.  for most other commands this is a precondition. not for "joinRoom".
  fn: (room, command, userId) => {
    if (room.get('pristine')) {
      joinNewRoom(room, command, userId);
    } else {
      joinExistingRoom(room, command, userId);
    }
  }
};

export default joinRoomCommandHandler;

function joinNewRoom(room, command, userId) {
  room.applyEvent('roomCreated', {});

  const avatar = Number.isInteger(command.payload.avatar) ? command.payload.avatar : 0;

  // produce a "roomJoined" event for our new room
  // this event must contain all information about the room, such that every joining user gets the current room state!
  // since it is a new room, no stories , no selectedStory, only one (our) user
  const joinedRoomEventPayload = {
    users: {
      [userId]: {
        disconnected: false,
        id: userId,
        username: command.payload.username,
        email: command.payload.email,
        avatar
      }
    },
    stories: {},
    selectedStory: undefined,
    cardConfig: defaultCardConfig
  };
  room.applyEvent('joinedRoom', joinedRoomEventPayload);

  if (command.payload.username) {
    room.applyEvent('usernameSet', {
      username: command.payload.username
    });
  }

  if (command.payload.email) {
    room.applyEvent('emailSet', {
      email: command.payload.email
    });
  }

  room.applyEvent('avatarSet', {
    avatar
  });
}

function joinExistingRoom(room, command, userId) {
  // if user joins an existing room with a preset userId, the userId is handled like a "session" token.
  // Since we do not handle any sensitive data, it is known and accepted, that with a known userId one user can hijack the "session" of
  // another user
  // so we do not check if another socket/userId pair is already connected/present in that room

  const userObject = getMatchingUserObjectFromRoom(room, command, userId);

  // produce a "roomJoined" event for an existing room
  // this event must contain all information about the room, such that every joining user gets the current room state!
  const joinedRoomEventPayload = {
    users: room.get('users').set(userObject.id, userObject).toJS(), // and all users that were already in that room
    stories: room.get('stories').toJS(),
    selectedStory: room.get('selectedStory'),
    cardConfig: room.get('cardConfig').toJS()
  };

  room.applyEvent('joinedRoom', joinedRoomEventPayload);

  if (userObject.username) {
    room.applyEvent('usernameSet', {
      username: userObject.username
    });
  }

  if (userObject.email) {
    room.applyEvent('emailSet', {
      email: userObject.email
    });
  }

  room.applyEvent('avatarSet', {
    avatar: userObject.avatar
  });

  if (userObject.excluded) {
    room.applyEvent('excludedFromEstimations', {});
  }
}

/**
 *  maybe user already exists in room (clients can reconnect with their userId)
 */
function getMatchingUserObjectFromRoom(room, command, userId) {
  let matchingExistingUser = room.getIn(['users', userId]);

  if (matchingExistingUser) {
    // use the already matching user (re-use already existing state like "excluded" flag etc.)
    // values from command payload take precedence.

    matchingExistingUser = matchingExistingUser.toJS();

    if (command.payload.username) {
      matchingExistingUser.username = command.payload.username;
    }

    if (command.payload.email) {
      matchingExistingUser.email = command.payload.email;
    }

    if (Number.isInteger(command.payload.avatar)) {
      matchingExistingUser.avatar = command.payload.avatar;
    }

    matchingExistingUser.disconnected = false;

    return matchingExistingUser;
  } else {
    return {
      id: userId,
      username: command.payload.username,
      email: command.payload.email,
      avatar: command.payload.avatar,
      disconnected: false,
      excluded: false
    };
  }
}
