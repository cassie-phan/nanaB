require('dotenv').config();
const {DiscordClient, Intents} = require("discord.js");
const {MongoClient, MongoErrorLabel} = require('mongodb');
const fetch = require('node-fetch');

// discord client and mongo client set up
const client = new DiscordClient({intents:[Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

client.once("ready", () => {
    console.log(`Logged in as $
        {client.user.tag}!`);
    mongoClient.connect((err) => {
        if (err) throw err;
        db = mongoClient.db('nanaB');
        console.log('Connected to MongoDB');
    });
});

client.on("message", async (msg) => {
    if (msg.content.startsWith('!p')){
        msg.channel.send('Welcome, Pokemon Trainer! Please use `!p help` for more commands!')
        const input = msg.content.split(' ')[1];
    } 
    if (!input){
        return msg.channel.send('Please enter a Pokemon or item name. eg: `!p Snorlax` or `p! nanaB berry`.');
    }
    try {
            const pokeName = await fetch('https://pogoapi.net/api/v1/pokemon_types.json');
            const pokeData = await pokemon.json();

            const itemName = await fetch('https://pogoapi.net/api/v1/items.json');
            const itemData = await item.json();

            pokeSearch = Object.values(pokeData).find(pokemon => pokemon.pokemon_name.toLowerCase() == query.toLowerCase());
            itemSearch = Object.values(itemData).find(item => item.name.toLowerCase() == query.toLowerCase());

            if (pokeSearch) {
                const response = `**${pokeSearch.pokemon_name}**\nType(s): ${pokeSearch.type.join(', ')}\nForm(s): ${pokeSearch.form.join(', ')}`;
                msg.channel.send(response)
            } else if (itemSearch) {
                const response = `**${itemSearch.name}**\nCategory: ${itemSearch.category(', ')}\nDescription: ${itemSearch.description}`;
                msg.channel.send(response)
            } else {
                msg.channel.send(`Data for "${input}" not found.`);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            msg.channel.send('Error in fetching data. Please try again.');
        }
    }
);

client.login(process.env.TOKEN);