class BotApi {
    static async getConversationMembers (ctx, { peer_id, access_token, fields = 'screen_name'}) {
        const { response: { profiles } } = await ctx.bot.api('messages.getConversationMembers', {
            peer_id,
            access_token,
            fields
        })

        return profiles;
    }
}

module.exports = BotApi;