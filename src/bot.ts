import { ethers, formatEther, parseEther } from "ethers";
import { Telegraf } from "telegraf";
import * as dotenv from "dotenv";
import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  REST,
  Routes,
  TextChannel,
} from "discord.js";

dotenv.config();

// Load environment variables
const TELEGRAM_BOT_TOKEN: string = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_GROUP_ID: string = process.env.TELEGRAM_GROUP_ID!;
const DISCORD_CHANNEL_ID: string = process.env.DISCORD_CHANNEL_ID!; // Replace with your channel ID
const DISCORD_BOT_TOKEN: string = process.env.DISCORD_BOT_TOKEN!;
const ZKSYNC_RPC: string = process.env.ZKSYNC_RPC!;
const DISCORD_APP_ID: string = process.env.DISCORD_APP_ID!;
const DISCORD_SERVER_ID: string = process.env.DISCORD_SERVER_ID!;

// Ensure required environment variables are set
if (
  !TELEGRAM_BOT_TOKEN ||
  !TELEGRAM_GROUP_ID ||
  !ZKSYNC_RPC ||
  !DISCORD_CHANNEL_ID
) {
  throw new Error(
    "Missing required environment variables. Please check your .env file."
  );
}

// Define bot commands
const commands = [
  {
    name: "teststake",
    description: "Test stake message",
  },
];

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required for message content access
  ],
});

// Initialize Telegram bot
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);
bot.start((ctx) => ctx.reply("Welcome"));

// Register Discord commands
const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN);
(async () => {
  try {
    console.log("Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationGuildCommands(DISCORD_APP_ID, DISCORD_SERVER_ID),
      { body: commands }
    );

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Error refreshing commands:", error);
  }
})();

// Event listener: Discord bot ready
client.once("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

// Function to send Telegram messages
const sendTelegramMessage = async (
  staker: string,
  amount: ethers.BigNumberish,
  txHash: string,
  zkPrice: number
): Promise<void> => {
  let images = "";
  const stakeValue = parseFloat(formatEther(amount)) * zkPrice;
  for (let i = 0; i < Math.round(stakeValue / 50); i++) {
    images += "🟢";
  }

  const message = `
<b>ZkStaking Stake! 🎉</b>
${images}

💰 <b>Stake:</b> <code>$${stakeValue.toFixed(2)}</code> (${formatEther(
    amount
  )} ZK)
👤 <b>Staker:</b> <a href="https://explorer.zksync.io/address/${staker}">${staker}</a>
🔗 <b>Transaction:</b> <a href="https://explorer.zksync.io/tx/${txHash}">View TX</a>
📉 <b>ZK Price:</b> $${zkPrice.toFixed(6)}

<a href="https://zksyncstake.com">Stake now</a>
  `;

  try {
    await bot.telegram.sendPhoto(
      TELEGRAM_GROUP_ID,
      "https://i.imgur.com/v80uAKc.jpg",
      {
        caption: message,
        parse_mode: "HTML",
      }
    );
  } catch (error) {
    console.error("Error sending Telegram message:", error);
  }
};

// Function to send Discord messages
const sendDiscordMessage = async (
  staker: string,
  amount: ethers.BigNumberish,
  txHash: string,
  zkPrice: number
): Promise<void> => {
  const channel = (await client.channels.fetch(
    DISCORD_CHANNEL_ID
  )) as TextChannel;

  if (channel?.isTextBased()) {
    let images = "";
    const stakeValue = parseFloat(formatEther(amount)) * zkPrice;
    for (let i = 0; i < Math.round(stakeValue / 50); i++) {
      images += "🟢";
    }

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle("New Stake Detected 🎉")
      .setDescription("A new staking event has occurred on zkSync!")
      .addFields(
        {
          name: "Staker",
          value: `[${staker.slice(0, 7)}...${staker.slice(
            -5
          )}](https://explorer.zksync.io/address/${staker})`,
          inline: true,
        },
        {
          name: "Amount Staked",
          value: `${formatEther(amount)} ZK`,
          inline: true,
        },
        {
          name: "Transaction Link",
          value: `[View Transaction](https://explorer.zksync.io/tx/${txHash})`,
        }
      )
      .setFooter({ text: "Stake now at zksyncstake.com" })
      .setThumbnail("https://i.imgur.com/v80uAKc.jpg");

    try {
      await channel.send({ embeds: [embed] });
      console.log("Discord message sent successfully.");
    } catch (error) {
      console.error("Error sending Discord message:", error);
    }
  }
};

// Discord interaction handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "teststake") {
    await sendDiscordMessage(
      "0x1234567890abcdef1234567890abcdef12345678",
      parseEther("852.3979"),
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
      0.240498
    );
    await interaction.reply("Test message has been sent!");
  }
});

// Telegram command handler
bot.command("teststake", async () => {
  await sendTelegramMessage(
    "0x1234567890abcdef1234567890abcdef12345678",
    parseEther("852.3979"),
    "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef",
    0.240498
  );
});

// Start the Discord bot
client.login(DISCORD_BOT_TOKEN);

// Start the Telegram bot
bot
  .launch()
  .catch((err) => console.error("Error launching Telegram bot:", err));

console.log("Listening for staking events...");

// const provider = new ethers.JsonRpcProvider(ZKSYNC_RPC);

// // Replace with your staking contract address and ABI
// const stakingContractAddress = "0xYourStakingContractAddress";
// const stakingAbi = [
//   // Replace with the actual event ABI
//   "event Staked(address indexed staker, uint256 amount)",
// ];

// // Create the staking contract instance
// const stakingContract = new ethers.Contract(
//   stakingContractAddress,
//   stakingAbi,
//   provider
// );

// // Listen for staking events
// stakingContract.on("Staked", (staker: string, amount: ethers.BigNumberish) => {
//   console.log(
//     `New Stake Detected: ${staker} staked ${formatEther(amount)} ETH`
//   );

//   // Create message
//   const message = `🚀 New Stake Alert!\n\n🔹 Address: ${staker}\n🔹 Amount: ${formatEther(
//     amount
//   )} ETH`;

//   // Send the message to the Telegram group
//   bot.telegram.sendMessage(GROUP_ID, message).catch(console.error);
// });
