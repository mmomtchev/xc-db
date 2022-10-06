import {IntlShape} from 'react-intl';

export const localizedDirections = (intl: IntlShape) => ({
    N: intl.formatMessage({defaultMessage: 'N', id: 'azsAaq'}),
    NE: intl.formatMessage({defaultMessage: 'NE', id: '8HVIIN'}),
    E: intl.formatMessage({defaultMessage: 'E', id: 'mcQmzA'}),
    SE: intl.formatMessage({defaultMessage: 'SE', id: 'j82jO6'}),
    S: intl.formatMessage({defaultMessage: 'S', id: 'Dap8yY'}),
    SW: intl.formatMessage({defaultMessage: 'SW', id: 'DYe0/0'}),
    W: intl.formatMessage({defaultMessage: 'W', id: 'YQN3JK'}),
    NW: intl.formatMessage({defaultMessage: 'NW', id: 'uD5roI'})
});

export const localizedMonths = (intl: IntlShape) => ({
    Jan: intl.formatMessage({defaultMessage: 'Jan', id: '3mcx52'}),
    Feb: intl.formatMessage({defaultMessage: 'Feb', id: 'lsI6+i'}),
    Mar: intl.formatMessage({defaultMessage: 'Mar', id: 'Ntypeb'}),
    Apr: intl.formatMessage({defaultMessage: 'Apr', id: 'vICE/x'}),
    May: intl.formatMessage({defaultMessage: 'May', id: 'zUpHdf'}),
    Jun: intl.formatMessage({defaultMessage: 'Jun', id: '040rfl'}),
    Jul: intl.formatMessage({defaultMessage: 'Jul', id: 'iPtQUl'}),
    Aug: intl.formatMessage({defaultMessage: 'Aug', id: '2eQSom'}),
    Sep: intl.formatMessage({defaultMessage: 'Sep', id: 'aV/c/P'}),
    Oct: intl.formatMessage({defaultMessage: 'Oct', id: '6Uae/q'}),
    Nov: intl.formatMessage({defaultMessage: 'Nov', id: 'OOkYHt'}),
    Dec: intl.formatMessage({defaultMessage: 'Dec', id: 'g7daoL'})
});
