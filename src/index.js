import React from 'react';
import ReactDOM from 'react-dom';
import 'semantic-ui-css/semantic.min.css';
import { BrowserRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import {composeWithDevTools } from 'redux-devtools-extension';
import rootReducer from "./redux/reducers";
import Root from './components/Root'

const store = createStore(rootReducer, composeWithDevTools());

ReactDOM.render(
  //<Router> we can only redirect if we're within a router 
  // <Provider store={store}>  provider will provide a global state to any component
  <Provider store={store}>
    <Router>
      <Root />
    </Router>
  </Provider>,
  document.getElementById('root')
);



