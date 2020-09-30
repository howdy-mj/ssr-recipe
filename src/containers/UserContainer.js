import React, { useEffect } from 'react';
import Users from '../components/Users';
import { connect } from 'react-redux';
import { getUsers } from '../modules/users';
import { Preloader } from '../lib/PreloadContext';

const UserContainer = ({ users, getUsers }) => {
  // mount되고 호출
  useEffect(() => {
    if (users) return; // 이미 Users가 있다면 요청 안함
    getUsers();
  }, [getUsers, users]);
  return (
    <>
      <Users users={users} />
      <Preloader resolve={getUsers} />
    </>
  );
};

export default connect(
  (state) => ({
    users: state.users.users,
  }),
  {
    getUsers,
  },
)(UserContainer);
