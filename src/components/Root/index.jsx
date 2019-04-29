import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Switch, Route, withRouter } from 'react-router-dom';
import firebase from '../../firebase';
import App from '../App';
import Login from '../Auth/Login'
import Register from '../Auth/Register'
import Spinner from '../Spinner'
import { setUser, clearUser } from '../../redux/actions'


class Root extends Component {
  componentDidMount() {
    firebase.auth().onAuthStateChanged(user => { // when rount component mounts 
      if (user) {
        this.props.setUser(user)
        firebase.database().ref('users').child(user.uid).on('value', snap => {
          if (snap.val() && snap.val().name) {
            this.props.history.push('/') // if we got a user than redirect to main page
          }
        })
      } else {
        this.props.history.push('./login');
        this.props.clearUser();
      }
    })
  }

  render() {
    return this.props.isLoading ? <Spinner /> : (
      <Switch>
        <Route exact path='/' component={App} />
        <Route path='/login' component={Login} />
        <Route path='/register' component={Register} />
      </Switch>
    )
  }
}

const mapStateToProps = state => ({
  isLoading: state.user.isLoading,
})
export default withRouter(connect(mapStateToProps, { setUser, clearUser })(Root));
 // withRouter HOC to put history obj within Root Component