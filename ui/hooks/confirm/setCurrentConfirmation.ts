import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { updatCurrentConfirmation } from '../../ducks/confirm/confirm';
import useCurrentConfirmation from './useCurrentConfirmation';

/*
 * This hook is called from <Confirm /> component to set current transaction.
 * This hook should be required to be invoked only when we are setting or re-setting
 * current confirmation displayed to the user.
 */
const setCurrentConfirmation = () => {
  const dispatch = useDispatch();
  const { currentConfirmation } = useCurrentConfirmation();

  useEffect(() => {
    if (currentConfirmation) {
      dispatch(updatCurrentConfirmation(currentConfirmation));
    }
  }, [currentConfirmation]);

  useEffect(() => {
    return () => {
      dispatch(updatCurrentConfirmation(undefined));
    };
  }, []);
};

export default setCurrentConfirmation;
