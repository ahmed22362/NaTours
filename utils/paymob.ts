import axios from 'axios';
import AppError from '../utils/AppError';

const PAYMOB_URL = 'https://accept.paymob.com/api';

export default class Paymob {
  private api_key;
  constructor(api_key: string) {
    this.api_key = api_key;
  }
  // step 1 in the doc
  async authenticate() {
    try {
      const url = `${PAYMOB_URL}/auth/tokens`;
      const headers = {
        'Content-Type': 'application/json',
      };
      const data = {
        api_key: this.api_key,
      };
      const response = await axios.post(url, data, { headers });
      const accessToken = response.data.token;
      return accessToken;
    } catch (error) {
      console.error('Error authenticating:', (error as Error).message);
    }
  }
  async registerOrder(order_items: any, amount: number) {
    // Authentication Request -- step 1 in the docs
    const accessToken = await this.authenticate();

    // Order Registration API -- step 2 in the docs
    const orderUrl = `${PAYMOB_URL}/ecommerce/orders`;
    const headers = {
      'Content-Type': 'application/json',
    };
    console.log(order_items);
    const orderData = {
      auth_token: accessToken,
      delivery_needed: 'false',
      amount_cents: amount * 100,
      currency: 'EGP',
      items: order_items,
    };
    try {
      const order = await axios.post(orderUrl, orderData);
      const orderId = order.data.id;
      return orderId;
    } catch (error) {
      throw new AppError(
        400,
        `Error register order: ${(error as Error).message}`
      );
    }
  }

  async pay(
    amount: number,
    billingData: any,
    orderId: string,
    integrationId: number
  ) {
    // Payment Key Request  -- step 3 in the docs
    const paymentKeyUrl = `${PAYMOB_URL}/acceptance/payment_keys`;
    const accessToken = await this.authenticate();
    const headers = {
      'Content-Type': 'application/json',
    };
    const paymentKeyData = {
      auth_token: accessToken,
      amount_cents: amount * 100,
      expiration: 3600,
      order_id: orderId,
      billing_data: billingData,
      currency: 'EGP',
      integration_id: integrationId,
    };
    try {
      const paymentKey = await axios.post(paymentKeyUrl, paymentKeyData, {
        headers,
      });
      return paymentKey.data.token;
    } catch (error) {
      throw new AppError(
        400,
        `some Thing wrong happened while get payment token! ${
          (error as Error).message
        }`
      );
    }
  }
  async payWithCard(amountCents: number, billingData: any, orderId: string) {
    let cardIntegrationId: number = parseInt(
      process.env.PAYMOB_ONLINE_CARD_INTEGRATION as string,
      10
    );
    const token = await this.pay(
      amountCents,
      billingData,
      orderId,
      cardIntegrationId
    );
    const iFrame = `https://accept.paymob.com/api/acceptance/iframes/755518?payment_token=${token}`;
    //https://accept.paymob.com/api/acceptance/iframes/755518?payment_token={payment_key_obtained_previously}

    return iFrame;
  }
  async payWithMobileWallet(
    amountCents: number,
    billingData: any,
    orderId: string,
    phoneNumber: string
  ) {
    const headers = {
      'Content-Type': 'application/json',
    };
    const walletPayURL = `${PAYMOB_URL}/acceptance/payments/pay`;
    let mobileWalletIntegrationId: number = parseInt(
      process.env.PAYMOB_MOBILE_WALLET_INTEGRATION as string,
      10
    );
    const token = await this.pay(
      amountCents,
      billingData,
      orderId,
      mobileWalletIntegrationId
    );
    const walletPayData = {
      source: {
        identifier: phoneNumber,
        subtype: 'WALLET',
      },
      token,
    };
    try {
      const response = await axios.post(walletPayURL, walletPayData, {
        headers,
      });
      console.log(response);
      return response.data.redirect_url;
    } catch (error: any) {
      throw new AppError(400, `Error Get Wallet pay: ${error.message}`);
    }
  }
}
