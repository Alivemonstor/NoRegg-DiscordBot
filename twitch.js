const axios = require('axios');
const Config = require('./config.json');

class Twitch {
    async getTwitchAccessToken() {
        try {
            const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
                params: {
                    client_id: Config['clientId'],
                    client_secret: Config['clientSecret'],
                    grant_type: 'client_credentials'
                }
            });

            const accessToken = response.data.access_token;
            console.log('Access Token:', accessToken);
            return accessToken;
        } catch (error) {
            console.error('Error getting access token:', error);
        }
    }

    async checkSub(accessToken) {
        if (!accessToken) {
            accessToken = await this.getTwitchAccessToken();
            if (!accessToken) return;
        }

        try {
            const response = await axios.get('https://api.twitch.tv/helix/eventsub/subscriptions', {
                headers: {
                    'Client-ID': Config['clientId'],
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const subscriptions = response.data.data;
            const subscription = subscriptions.find(sub => sub.type === 'stream.online' && sub.condition.broadcaster_user_id === '117888472');

            if (subscription) {
                console.log(`Subscription status: ${subscription.status}`);
            } else {
                console.log('Subscription not found.');
            }
        } catch (error) {
            console.error('Error checking subscription status:', error);
        }
    }

    async deleteTwitchSubscriptions() {
        const accessToken = await this.getTwitchAccessToken();
        if (!accessToken) return;

        try {
            const response = await axios.get('https://api.twitch.tv/helix/eventsub/subscriptions', {
                headers: {
                    'Client-ID': Config['clientId'],
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const subscriptions = response.data.data;
            for (const subscription of subscriptions) {
                try {
                    await axios.delete(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${subscription.id}`, {
                        headers: {
                            'Client-ID': Config['clientId'],
                            'Authorization': `Bearer ${accessToken}`
                        }
                    });
                    console.log(`Deleted subscription: ${subscription.id}`);
                } catch (error) {
                    console.error(`Error deleting subscription ${subscription.id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error listing subscriptions:', error);
        }
    }

    async createTwitchSubscription() {
        const accessToken = await this.getTwitchAccessToken();
        if (!accessToken) return;

        try {
            const response = await axios.post('https://api.twitch.tv/helix/eventsub/subscriptions', {
                type: 'stream.online',
                version: '1',
                condition: {
                    broadcaster_user_id: '117888472'
                },
                transport: {
                    method: 'webhook',
                    callback: 'https://6255-31-205-18-91.ngrok-free.app/webhook',
                    secret: Config['TwitchSecret'],
                }
            }, {
                headers: {
                    'Client-ID': Config['clientId'],
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(response.data);
        } catch (error) {
            if (error.response && error.response.status === 409) {
                console.log('Subscription already exists.');
                this.checkSub(accessToken);
            } else {
                console.error('Error creating subscription:', error);
            }
        }
    }

    async getPreview(broadcasterUserId) {
        const accessToken = await this.getTwitchAccessToken();
        if (!accessToken) return;

        try {
            const response = await axios.get(`https://api.twitch.tv/helix/streams?user_id=${broadcasterUserId}`, {
                headers: {
                    'Client-ID': Config['clientId'],
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const stream = response.data.data[0];
            if (stream) {
                return stream.thumbnail_url.replace('{width}', '320').replace('{height}', '180');
            } else {
                console.error('Stream not found.');
                return null;
            }
        } catch (error) {
            console.error('Error getting stream thumbnail URL:', error);
            return null;
        }
    }
}

module.exports = Twitch;