import { combineReducers } from 'redux';
import { user_reducer, channel_reducer, colors_reducer } from './userReducer'

const rootReducer = combineReducers({
  user: user_reducer,
  channel: channel_reducer,
  colors: colors_reducer,
})

export default rootReducer;
