require('dotenv').config();
const {DiscordClient, Intents} = require("discord.js");
const {MongoClient, MongoErrorLabel} = require('mongodb');
const fetch = require('node-fetch');

// discord client and mongo client set up
const client = new DiscordClient({intents:[Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]});
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

async function mongoConnect(){
    const mongoClient = new MongoClient(process.env.MONGO_URI, { useNewUrlPaser: true, useUnifiedTopology: true});
    try {
        await mongoClient.connect();
        db = mongoClient.db('nanab-bot');
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error: ', err);
    }
}

async function fetchDataCache(collectionName, api){
    const collection = db.collection(collectionName);
    const cached = await collection.findOne({});
    if (cached) {
        return cached.data;
    }
    const response = await fetch(api);
    const data = await response.json();

    await collection.updateOne({}, { $set: { data: data } }, { upsert: true});
    return data;
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    connectToMongoDB();
});

client.on("message", async (msg) => {
    const args = msg.conect.split(' ');
    const command = args[0];
    const input = args[1] ? args[1].toLowerCase() : null;

    if (command == '!p' && input == 'help'){
        const helpMsg = `
        **nanaB bot: Pokémon GO - help page**
        
        Here is a list of the availiable commands:
        - \`!p <pokemon_name>\`: detailed profile of pokemon entered including id, type, forms, max CP, moves, shiny, and gender.
            - example: \`!p snorlax\`
        
         - \`!p <type_name>\`: detailed description of pokemon type entered including strengths, weaknesses, resistances, and vulnerabilities.
            - example: \`!p water\`
        
        - \`!p <item_name>\`: detailed description of item entered.
            - example: \`!p nanab berry\`
        
        - \`!p <region_name>\`: complete list of all pokemon from region entered.
            - example: \`!p kanto\`
                
        - \`!p shiny\`: complete list of all shiny pokemon availiable.
        
        - \`!p help\`: complete list of all commands availiable.
            `;
            msg.channel.send(helpMsg);
            return;
    } if (!input) {
        return msg.channel.send('Please enter a pokemon, item, type, region, "shiny", or "help"');
    }

    try {
        const pokeData = await fetchDataCache('pokeType','https://pogoapi.net/api/v1/pokemon_types.json');
        const pokeMovesData = await fetchDataCache('pokeMoves', 'https://pogoapi.net/api/v1/pokemon_moves.json');
        const pokeStatsData = await fetchDataCache('pokeStats', 'https://pogoapi.net/api/v1/pokemon_stats.json');
        const itemData = await fetchDataCache('items', 'https://pogoapi.net/api/v1/items.json');
        const shinyData = await fetchDataCache('shiny', 'https://pogoapi.net/api/v1/shiny_pokemon.json');
        const genderData = await fetchDataCache('genderData', 'https://pogoapi.net/api/v1/pokemon_genders.json');
        const typeEffectivenessData = await fetchDataCache('typeEffectiveness', 'https://pogoapi.net/api/v1/type_effectiveness.json');

        if (command === !p){
            const pokeInfo = Object.values(pokeData).find(pokemon => pokemon.pokemon_name.toLowerCase() === input);
            if (pokeInfo) { //!p pokemon
                const pokeStats = pokeStatsData[input];
                const pokeMoves = pokeMovesData[input];
                const shinyAvail = shinyData[input] ? 'Yes' : 'No';
                const maxCP = pokeStats ? pokeStats.max_cp : 'Unknown';
                const buddyDistance = pokeStats ? pokeStats.buddy_distance : 'Unknown';
                const fastMoves = pokeMoves ? pokeMoves.fast_moves.join(', ') : 'Unknown';
                const chargedMoves = pokeMoves ? pokeMoves.charged_moves.join(', ') : 'Unknown';
                const pokemonID = pokeStats ? pokeStats.pokemon_id : 'Unknown';
                const gender = genderData[input];
                let genderDiff = 'None';
                if (gender && gender.has_gender_diff){
                    genderDiff = `Female: ${gender.female_form}, Male: ${gender.male_form}`;
                }
                const response = `**${pokeInfo.pokemon_name}** (ID: ${pokemonID}) \n
                Type(s): ${pokeInfo.type.join(', ')}
                Forms(s): ${pokeInfo.type.join(', ')}
                Max CP: ${maxCP}
                Fast Moves: ${fastMoves}
                Charged Moves: ${chargedMoves}
                Shiny Available: ${shinyAvail}
                Gender Differences: ${genderDiff}
                Buddy Distance: ${buddyDistance} km`;
                msg.channel.send(response);
            } else { // !p items
                const itemInfo = Object.values(itemData).find(item => item.name.toLowerCase() === input);
                if (itemInfo){
                    msg.channel.send(`**${itemInfo.name}**\nCategory: ${itemInfo.category}\nDescription: ${itemInfo.description}`);
                } else if (query === 'shiny'){
                    const shinyList = Object.keys(shinyData).join(', ');
                    msg.channel.send(`Shiny Pokémon availiable:\n${shinyList}`);
                } else {
                    const regionInfo = Object.values(generationsData).find(region => region.name.toLowerCase() === input);
                    if (regionInfo){
                        const pokeRegion = regionInfo.pokemon.map(p => p.pokemon_name).join(', ');
                        msg.channel.send(`Pokémon in the ${regionInfo.name} region:\n${pokeRegion}`);
                    } else {
                        msg.channel.send(`Data for "${input}" not found.`);
                    }
                }
            }
        }
        if (command === '!p' && args[1].toLowerCase() === 'type'){
            const typeInput = args[2].toLowerCase();
            const typeInfo = typeEffectivenessData[typeInput];
            if (typeInfo){
                const strong = typeInfo.strengths.join(', ');
                const weak = typeInfo.weaknesses.join(', ');
                const resist = typeInfo.resistances.join(', ');
                const vulnerable = typeInfo.vulnerabilities.join(', ');

                msg.channel.send(`**Type: ${typeInput.charAt(0).toUpperCase() + typeInput.slice(1)}**\n
                Strong Against: ${strong}
                Weak Against: ${weak}
                Resisted By: ${resist}
                Vulnerable To: ${vulnerable}`);
            } else {
                msg.channel.send(`Type effectiveness data not found for "${typeInput}" not found.`);
            }
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        msg.channel.send('Error in fetching data. Please try again.')
    }
    
});

client.login(process.env.TOKEN);