import { Component } from 'preact';
import { route } from 'preact-router';
import { translate } from 'react-i18next';
import { apiGet, apiPost } from '../../utils/request';
import { apiWebsocket } from '../../utils/websocket';
import { ButtonLink } from '../../components/forms';
import { Guide, Entry } from '../../components/guide/guide';
import Balance from '../../components/balance/balance';
import HeadersSync from '../../components/headerssync/headerssync';
import Status from '../../components/status/status';
import Transactions from '../../components/transactions/transactions';
import Spinner from '../../components/spinner/Spinner';
import A from '../../components/anchor/anchor';
import componentStyle from '../../components/style.css';

@translate()
export default class Account extends Component {
    state = {
        walletInitialized: false,
        transactions: [],
        walletConnected: false,
        balance: null,
        hasCard: false,
    }

    componentWillMount() {
        document.addEventListener('keydown', this.handleKeyDown);
    }

    componentDidMount() {
        this.unsubscribe = apiWebsocket(this.onWalletEvent);
        this.checkSDCards();
        if (!this.props.code) {
            return;
        }
        this.onStatusChanged();
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleKeyDown);
        this.unsubscribe();
    }

    componentDidUpdate(prevProps, prevState) {
        if (!this.props.code) {
            if (this.props.accounts && this.props.accounts.length) {
                console.log('route', `/account/${this.props.accounts[0].code}`);
                return route(`/account/${this.props.accounts[0].code}`, true);
            }
            return;
        }
        if (this.props.code !== prevProps.code) {
            this.onStatusChanged();
            this.checkSDCards();
        }
        if (this.props.deviceIDs.length !== prevProps.deviceIDs.length) {
            this.checkSDCards();
        }
    }

    checkSDCards() {
        Promise.all(this.props.deviceIDs.map(deviceID => {
            return apiGet(`devices/${deviceID}/info`)
                .then(({ sdcard }) => sdcard);
        }))
            .then(sdcards => sdcards.some(sdcard => sdcard))
            .then(hasCard => this.setState({ hasCard }));
    }

    handleKeyDown = e => {
        if (e.keyCode === 27 && !this.state.isConfirming) {
            this.setState({
                isReceive: false,
            });
        }
    }

    onWalletEvent = data => {
        if (!this.props.code) return;
        if (data.type !== 'wallet' || data.code !== this.props.code) {
            return;
        }
        switch (data.data) {
        case 'statusChanged':
            this.onStatusChanged();
            break;
        case 'syncdone':
            this.onWalletChanged();
            break;
        }
    }

    onStatusChanged() {
        const code = this.props.code;
        if (!code) return;
        apiGet(`wallet/${code}/status`).then(status => {
            let state = {
                walletInitialized: status.includes('accountSynced'),
                walletConnected: !status.includes('offlineMode'),
            };
            if (!status.walletInitialized && !status.includes('accountDisabled')) {
                apiPost(`wallet/${code}/init`);
            }

            this.setState(state);
            this.onWalletChanged();
        });
    }

    onWalletChanged = () => {
        if (!this.props.code) return;
        if (this.state.walletInitialized && this.state.walletConnected) {
            apiGet(`wallet/${this.props.code}/balance`).then(balance => {
                this.setState({ balance });
            });
            apiGet(`wallet/${this.props.code}/transactions`).then(transactions => {
                this.setState({ transactions });
            });
        } else {
            this.setState({ balance: null });
            this.setState({ transactions: [] });
        }
    }

    render({
        t,
        accounts,
        deviceIDs,
        guide,
        fiat,
    }, {
        transactions,
        walletInitialized,
        walletConnected,
        balance,
        hasCard,
    }) {
        if (!accounts) return null;
        const wallet = accounts.find(({ code }) => code === this.props.code);
        if (!wallet) return null;

        const noTransactions = (walletInitialized && transactions.length <= 0);
        return (
            <div class="contentWithGuide">
                <div class="container">
                    <div class="headerContainer">
                        <Status type="warning">
                            {hasCard && t('warning.sdcard')}
                        </Status>
                        <div class="header">
                            <Balance t={t} name={wallet.name} balance={balance} fiat={fiat} />
                            <div class={componentStyle.buttons} style="align-self: flex-end;">
                                <ButtonLink
                                    primary
                                    href={`/account/${this.props.code}/receive`}
                                    disabled={!walletInitialized}>
                                    {t('button.receive')}
                                </ButtonLink>
                                <ButtonLink
                                    primary
                                    href={`/account/${this.props.code}/send`}
                                    disabled={!walletInitialized || balance && balance.available.amount === '0'}>
                                    {t('button.send')}
                                </ButtonLink>
                            </div>
                        </div>
                        <div>
                            {
                                !walletConnected && (
                                    <Status>
                                        <p>{t('account.disconnect')}</p>
                                    </Status>
                                )
                            }
                        </div>
                    </div>
                    <div class={['innerContainer', ''].join(' ')}>
                        <HeadersSync coinCode={wallet.coinCode} />
                        {
                            !walletInitialized || !walletConnected ? (
                                <Spinner text={
                                    !walletInitialized && t('account.initializing') ||
                                    !walletConnected && t('account.reconnecting')
                                } />
                            ) : (
                                <Transactions
                                    explorerURL={wallet.blockExplorerTxPrefix}
                                    transactions={transactions}
                                    className={noTransactions ? 'isVerticallyCentered' : 'scrollableContainer'}
                                    fiat={fiat}
                                />
                            )
                        }
                        <Status dismissable keyName={`info-${this.props.code}`} type="info">
                            {t(`account.info.${this.props.code}`)}
                        </Status>
                    </div>
                </div>
                <Guide guide={guide} screen="account">
                    <Entry title={t('guide.accountDescription.title')}>
                        <p>{t('guide.accountDescription.text')}</p>
                    </Entry>
                    {balance && balance.available.amount === '0' && <Entry title={t('guide.accountSendDisabled.title', { unit: balance.available.unit })}>
                        <p>{t('guide.accountSendDisabled.text')}</p>
                    </Entry>}
                    <Entry title={t('guide.accountReload.title')}>
                        <p>{t('guide.accountReload.text')}</p>
                    </Entry>
                    {transactions.length > 0 && <Entry title={t('guide.accountTransactionLabel.title')}>
                        <p>{t('guide.accountTransactionLabel.text')}</p>
                    </Entry>}
                    {transactions.length > 0 && <Entry title={t('guide.accountTransactionTime.title')}>
                        <p>{t('guide.accountTransactionTime.text')}</p>
                    </Entry>}
                    {transactions.length > 0 && <Entry title={t('guide.accountTransactionAttributes.title')}>
                        <ul>
                            {t('guide.accountTransactionAttributes.text').map(p => <li>{p}</li>)}
                        </ul>
                    </Entry>}
                    {balance && balance.hasIncoming && <Entry title={t('guide.accountIncomingBalance.title')}>
                        <p>{t('guide.accountIncomingBalance.text')}</p>
                    </Entry>}
                    <Entry title={t('guide.accountTransactionConfirmation.title')}>
                        <p>{t('guide.accountTransactionConfirmation.text')}</p>
                    </Entry>
                    <Entry title={t('guide.accountFiat.title')}>
                        <p>{t('guide.accountFiat.text')}</p>
                    </Entry>
                    <Entry title={t('guide.accountRates.title')}>
                        <p>{t('guide.accountRates.text')}</p>
                        <p><A href={t('guide.accountRates.link.url')}>{t('guide.accountRates.link.text')}</A></p>
                    </Entry>

                </Guide>
            </div>
        );
    }
}
