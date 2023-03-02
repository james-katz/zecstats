const { Client, GatewayIntentBits, ModalSubmitInteraction, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const CoinGecko = require('coingecko-api');
const axios = require('axios');

const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

const { v4: uuidv4 } = require('uuid');

const dotenv = require('dotenv');

dotenv.config();
const CoinGeckoClient = new CoinGecko();
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 1000, height: 600, backgroundColour: '#2f3136'});

const client = new Client({
    intents: [
       GatewayIntentBits.Guilds,
       GatewayIntentBits.GuildMessages,    
   ],
});
console.log("Booting...");

client.once('ready', () => {
    console.log("Ready!");    
});

const languages = {
    pt: {
        title: 'Zcash - Estatísticas',
        description: 'Estatísticas sobre a criptomoeda Zcash.',
        ticker: 'Moeda',
        symbol: 'Símbolo',
        algo: 'Algorítimo',
        market_usd: 'Preço de mercado (usd)',
        market_btc: 'Preço de mercado (btc)',
        market_brl: 'Preço de mercado (brl)',
        price_low: 'Menor preço 24h',
        price_high: 'Mario preço 24h',
        price_percent: 'Flutuação 24h',
        atl_price: 'Baixa histórica (usd)',
        atl_date: 'Data',
        atl_change: 'Variação',
        ath_price: 'Alta histórica (usd)',
        ath_date: 'Data',
        ath_change: 'Variação',
        market_cap: 'Capitalização de mercado',
        market_cap_rank: 'Posição ',
        max_supply: 'Fornecimento máximo',
        circulation: 'Em circulação',
        block_height: 'Altura do bloco',
        full_node: 'Full nodes (aprox.)',
        wallets_hodl: 'Total de carteiras (*hodling*)',
        chain_size: 'Tamanho da blockchain',
        blocks_mined: 'Blocos minerados 24h',
        hashrate: 'Hashrate da rede',
        volume: 'Volume 24h',
        credits: 'Dados fornecidos por CoinGecko e BlockChair',
        cd_title: 'Zcash Halving Contagem Regressiva',
        cd_description: 'Estatísticas sobre o próximo halving da Zcash',
        cd_curr_height: 'Alturo do bloco atual',
        cd_halv_height: 'Altura do bloco do Halving',
        cd_remain_blocks: 'Blocos restantes',
        cd_date: 'Quando será o halving?',
        cd_countdown: 'Contagem Regressiva',
        cd_aprox_date: 'As datas são aproximadas, baseadas no tempo médio do bloco.',
        cd_sec: ' segundo.',
        cd_secs: ' segundoss.',
        cd_min: ' minuto ',
        cd_mins: ' minutos ',
        cd_hours: ' horas ',
        cd_hour: ' hora ',
        cd_day: ' dia ',
        cd_days: ' dias '
    },
    en: {
        title: 'Zcash - Stats',
        description: 'Zcash Cryptocurrency Statistics.',
        ticker: 'Ticker',
        symbol: 'Symbol',
        algo: 'Algorithm',
        market_usd: 'Market price (usd)',
        market_btc: 'Market price (btc)',
        market_brl: 'Market price (brl)',
        price_low: 'Lowest price 24h',
        price_high: 'Highest price 24h',
        price_percent: 'Change 24h',
        atl_price: 'All time low (usd)',
        atl_date: 'Date',
        atl_change: 'Change',
        ath_price: 'All time high (usd)',
        ath_date: 'Date',
        ath_change: 'Change',
        market_cap: 'Market cap.',
        market_cap_rank: 'Rank ',
        max_supply: 'Max. Supply',
        circulation: 'Circulating',
        block_height: 'Block height',
        full_node: 'Full nodes (approx.)',
        wallets_hodl: 'Number of wallets (*hodling*)',
        chain_size: 'Blockchain size',
        blocks_mined: 'Mined blocks 24h',
        hashrate: 'Network Hashrate',
        volume: 'Volume 24h',
        credits: 'All data provided by CoinGecko and BlockChair',
        cd_title: 'Zcash Halving Countdown',
        cd_description: 'Statistics about Zcash Halving.',
        cd_curr_height: 'Current height',
        cd_halv_height: 'Halving height',
        cd_remain_blocks: 'Remaining blocks',
        cd_date: 'When it will happen?',
        cd_countdown: 'Countdown',
        cd_aprox_date: 'Dates are approximated based on block time average.',
        cd_sec: ' second.',
        cd_secs: ' seconds.',
        cd_min: ' minute ',
        cd_mins: ' minutes ',
        cd_hours: ' hours ',
        cd_hour: ' hour ',
        cd_day: ' day ',
        cd_days: ' days '        
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    
    const { commandName } = interaction;
    if(commandName === 'zecstats') {
        interaction.deferReply();
        const local = interaction.locale == 'pt-BR' ? languages.pt : languages.en;
        
        const bc = await axios.get('https://api.blockchair.com/zcash/stats');
        const blockChair = bc.data;

        const params = {
            tickers: false,
            market_data: true,
            community_data: false,
            developer_data: false,
            localization: false,
            sparkline: false
        };
        const res = await CoinGeckoClient.coins.fetch('zcash', params);
        
        if(!res || !res.success) {
            await interaction.reply('error')
            return;
        }
        const [chart, uuid] = await createChart();
        
        const attach = new AttachmentBuilder(chart, {name: uuid+'.png'});
                
        const zcashEmbed = new EmbedBuilder()
            .setColor(0xf4b728)
            .setAuthor({name: local.title, iconURL: res.data.image.thumb})
            .setDescription(local.description)
            // .setThumbnail(res.data.image.large)            
            .addFields([
                {name: local.ticker, value: res.data.name, inline: true},
                {name: local.symbol, value: res.data.symbol, inline: true},
                {name: local.algo, value: res.data.hashing_algorithm, inline: true}
            ])
            .addFields([
                {name: local.market_usd, value: '$ '+res.data.market_data.current_price.usd.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.market_btc, value: '₿ '+JSON.stringify(res.data.market_data.current_price.btc), inline: true},
                {name: local.market_brl, value: 'R$ '+res.data.market_data.current_price.brl.toLocaleString(interaction.locale || 'en-US'), inline: true}
            ])
            .addFields([
                {name: local.price_low, value: '$ '+res.data.market_data.low_24h.usd.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.price_high, value: '$ '+res.data.market_data.high_24h.usd.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.price_percent, value: res.data.market_data.price_change_percentage_24h.toLocaleString(interaction.locale || 'en-US')+' %', inline: true}
            ])
            .addFields([
                {name: local.atl_price, value: '$ '+res.data.market_data.atl.usd.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.ath_date, value: new Date(res.data.market_data.atl_date.usd).toLocaleDateString(interaction.locale || 'en-US'), inline: true},
                {name: local.atl_change, value: res.data.market_data.atl_change_percentage.usd.toLocaleString(interaction.locale || 'en-US')+' %', inline: true}
            ])
            .addFields([
                {name: local.ath_price, value: '$ '+res.data.market_data.ath.usd.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.ath_date, value: new Date(res.data.market_data.ath_date.usd).toLocaleDateString(interaction.locale || 'en-US'), inline: true},
                {name: local.ath_change, value: res.data.market_data.ath_change_percentage.usd.toLocaleString(interaction.locale || 'en-US')+' %', inline: true}
            ])
            .addFields([
                {name: local.market_cap, value: '$ '+res.data.market_data.market_cap.usd.toLocaleString(interaction.locale || 'en-US') + ' ('+ local.market_cap_rank + res.data.market_cap_rank+')', inline: true},
                {name: local.max_supply, value: res.data.market_data.max_supply.toLocaleString(interaction.locale || 'en-US') + ' ZEC', inline: true},
                {name: local.circulation, value: Math.floor(res.data.market_data.circulating_supply).toLocaleString(interaction.locale || 'en-US') + ' ZEC', inline: true}
            ])
            .addFields([
                {name: local.block_height, value: blockChair.data.blocks.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.full_node, value: blockChair.data.nodes.toLocaleString(interaction.locale || 'en-US'), inline: true},
                {name: local.wallets_hodl, value: blockChair.data.hodling_addresses.toLocaleString(interaction.locale || 'en-US'), inline: true}
            ])
            .addFields([
                {name: local.chain_size, value: (blockChair.data.blockchain_size/1000000000).toLocaleString(interaction.locale || 'en-US') + ' GB', inline: true},                
                {name: local.blocks_mined, value: blockChair.data.blocks_24h.toLocaleString(), inline: true},
                {name: local.hashrate, value: (blockChair.data.hashrate_24h/1000000000).toLocaleString(interaction.locale || 'en-US') + ' GH/s', inline: true}
            ])
            .addFields([
                {name: local.volume, value: '$ '+res.data.market_data.total_volume.usd.toLocaleString(interaction.locale || 'en-US'), inline: true},                
            ])
            .setImage('attachment://'+uuid+'.png')
            .setTimestamp()
            .setFooter({text: local.credits})
            
        await interaction.editReply({embeds: [zcashEmbed], files: [attach]})
        .catch(err => {            
            console.log(err);
        })
    }

    if(commandName == 'zcountdown') {
        await interaction.deferReply();
        const local = interaction.locale == 'pt-BR' ? languages.pt : languages.en;

        const res = await axios.get('http://3.145.101.81:3001/');
        const countdown = res.data;
        
        const d = countdown.countdown.days;
        const h = countdown.countdown.hours;
        const m = countdown.countdown.mins;
        const s = countdown.countdown.secs;
        
        const remaining = d + (d > 1 ? local.cd_days : local.cd_day) + h + (h > 1 ? local.cd_hours : local.cd_hour) + m + (m > 1 ? local.cd_mins : local.cd_min) + s + (s > 1 ? local.cd_secs : local.cd_sec);
        const halvingDate = new Date(countdown.halving_date);
        
        const countdownEmbed = new EmbedBuilder()
            .setTitle(local.cd_title)
            .setColor(0x2e93a1)
            .setDescription(local.cd_description)
            .addFields([
                {name: local.cd_curr_height, value: countdown.height.toLocaleString(), inline: true},
                {name: local.cd_halv_height, value: countdown.next_halving.toLocaleString(), inline: true},
                {name: local.cd_remain_blocks, value: countdown.remaining_blocks.toLocaleString(), inline: true},
            ])
            .addFields([
                {name: local.cd_date, value: '🗓️ ' + (halvingDate.toLocaleDateString() + ' 🕙 ' + halvingDate.toLocaleTimeString())},
                {name: local.cd_countdown, value: remaining}
            ])
            .setFooter({text: local.cd_aprox_date})
            .setTimestamp();

        await interaction.editReply({embeds:[countdownEmbed]}).catch();
    }
});

async function createChart() {
    const res = await CoinGeckoClient.coins.fetchMarketChart('zcash', {days: 1, vs_currency: 'usd'});
    const mapped = res.data.prices.map(el => {
        let m = {};
        m.x = new Date(el[0]).toLocaleTimeString();
        m.y = el[1];
        return m
    });
    
    const data = {
        //labels: mapped,
        datasets: [
            {
                label: 'Preço $ZEC 24h',
                data: mapped,
                borderColor: '#f4b724',
                backgroundColor: '#f4b72444',
                fill: 'start',
                pointRadius: 0,
                borderWidth: 2
            }
        ]
    }
    
    const chartConfig = {
        type: 'line',
        data: data,
        options: {
            plugins: {
            filler: {
                propagate: false,
            },
            title: {
                display: false,
                text: (ctx) => 'Fill: ' + ctx.chart.data.datasets[0].fill
            }
            },
            interaction: {
            intersect: false,
            }
        }
    }
    const buffer = await chartJSNodeCanvas.renderToBuffer(chartConfig);
    const uuid = uuidv4();
    return [buffer, uuid];
}

client.login(process.env.DISCORD_TOKEN);