class BotApi {
    static async getConversationMembers (api, { peer_id, access_token, fields = 'screen_name'}) {
        const { response: { profiles } } = await api('messages.getConversationMembers', {
            peer_id,
            access_token,
            fields
        })

        return profiles;
    }

    static async getChatPreview (api, { peer_id, access_token }) {
        return await api('messages.getChatPreview', { peer_id, access_token });
    }
}

module.exports = BotApi;