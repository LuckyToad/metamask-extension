import React from 'react';
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom';
import * as actions from '../../../../store/actions';
import { DEFAULT_ROUTE } from '../../../../helpers/constants/routes';
import {
  Text,
  ButtonSecondary,
  ButtonPrimary,
  Box,
} from '../../../component-library';
import {
  TextAlign,
  FontWeight,
  TextVariant,
  Size,
} from '../../../../helpers/constants/design-system';
import { useI18nContext } from '../../../../hooks/useI18nContext';

export default function ImportTokensExitModal() {
  const t = useI18nContext();
  const dispatch = useDispatch();
  const history = useHistory();

  const later = (delay) => {
    return new Promise(function (resolve) {
      setTimeout(resolve, delay);
    });
  };

  const hideModal = () => dispatch(actions.hideModal());

  const forceHideModal = () => {
    later(0).then(() => {
      dispatch(actions.clearPendingTokens());
      dispatch(actions.hideModal());
    });
  };

  return (
    <div className="exit-token-confirmation">
      <div className="exit-token-confirmation__container">
        <Text
          textAlign={TextAlign.Center}
          fontWeight={FontWeight.Bold}
          variant={TextVariant.bodyMd}
        >
          {t('importExitHeader')}
        </Text>
        <Box marginTop={5} className="exit-token-confirmation__title">
          {t('importExitConfirmation')}
        </Box>

        <div className="exit-token-confirmation__buttons">
          <ButtonSecondary
            data-testid="exit-token-confirmation__back"
            size={Size.LG}
            onClick={() => hideModal()}
            block
          >
            {t('back')}
          </ButtonSecondary>
          <ButtonPrimary
            size={Size.LG}
            data-testid="exit-token-confirmation__confirm"
            onClick={() => {
              forceHideModal();
              history.push(DEFAULT_ROUTE);
            }}
            block
          >
            {t('confirm')}
          </ButtonPrimary>
        </div>
      </div>
    </div>
  );
}
