// openAIFunctions.js

const OpenAI = require('openai'); // To interact with OpenAI
require('dotenv').config();

// Import necessary functions from MusicFunctions.js
const {
  getTrackInfo,
  getRelatedTracks,
  searchTrack,
  getAlbumInfo,
  searchAlbum,
  getTagsTopTracks,
  getTagsTopArtists,
  addToPlaylist,
  deleteFromPlaylist,
  printPlaylist,
} = require('./MusicFunctions');

// Define the functions that OpenAI has access to
const functionDefinitions = [
  {
    name: 'searchTrack',
    description: 'Searches for tracks based on a song title.',
    parameters: {
      type: 'object',
      properties: {
        songTitle: {
          type: 'string',
          description: 'The title of the song to search for.',
        },
        limit: {
          type: 'integer',
          description: 'The number of tracks to return (default is 5).',
          default: 5,
        },
      },
      required: ['songTitle'],
    },
  },
  {
    name: 'getTrackInfo',
    description: 'Retrieves detailed information about a specific track.',
    parameters: {
      type: 'object',
      properties: {
        artist: {
          type: 'string',
          description: 'The name of the artist.',
        },
        songTitle: {
          type: 'string',
          description: 'The title of the song.',
        },
      },
      required: ['artist', 'songTitle'],
    },
  },
  {
    name: 'getRelatedTracks',
    description: 'Searches for similar tracks',
    parameters: {
      type: 'object',
      properties: {
        artist: {
          type: 'string',
          description: 'The name of the artist.',
        },
        songTitle: {
          type: 'string',
          description: 'The title of the song to search for.',
        },
        limit: {
          type: 'integer',
          description: 'The number of tracks to return (default is 5).',
          default: 5,
        },
      },
      required: ['artist', 'songTitle'],
    },
  },
  {
    name: 'getAlbumInfo',
    description: 'Search for information about a particular album by an artist',
    parameters: {
      type: 'object',
      properties: {
        artist: {
          type: 'string',
          description: 'The artist of the album.',
        },
        albumTitle: {
          type: 'string',
          description: 'The title of the album.',
        },
      },
      required: ['artist', 'albumTitle'],
    },
  },
  {
    name: 'searchAlbum',
    description: 'Search for albums of the title provided',
    parameters: {
      type: 'object',
      properties: {
        albumTitle: {
          type: 'string',
          description: 'The title of the album.',
        },
        limit: {
          type: 'integer',
          description: 'The number of tracks to return (default is 5).',
          default: 5,
        },
      },
      required: ['albumTitle'],
    },
  },
  {
    name: 'getTagsTopTracks',
    description: 'Search the top tracks related to a particular mood/genre/tag',
    parameters: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'The tag related to a track.',
        },
        limit: {
          type: 'integer',
          description: 'The number of tracks to return (default is 5).',
          default: 5,
        },
      },
      required: ['tag'],
    },
  },
  {
    name: 'getTagsTopArtists',
    description: 'Search the top artists related to a particular mood/genre/tag',
    parameters: {
      type: 'object',
      properties: {
        tag: {
          type: 'string',
          description: 'The tag related to an artist.',
        },
        limit: {
          type: 'integer',
          description: 'The number of artists to return (default is 5).',
          default: 5,
        },
      },
      required: ['tag'],
    },
  },
  {
    name: 'addToPlaylist',
    description: 'Adds a particular track to the playlist',
    parameters: {
      type: 'object',
      properties: {
        songTitle: {
          type: 'string',
          description: 'The title of the song.',
        },
        artist: {
          type: 'string',
          description: 'The name of the artist.',
        },
      },
      required: ['songTitle', 'artist'],
    },
  },
  {
  name: 'deleteFromPlaylist',
    description: 'delete a particular track to the playlist',
    parameters: {
      type: 'object',
      properties: {
        songTitle: {
          type: 'string',
          description: 'The title of the song to remove.',
        },
        artist: {
          type: 'string',
          description: 'The name of the artist to remove.',
        },
      },
      required: ['songTitle', 'artist'],
    },
  },
  {
    name: 'printPlaylist',
    description: 'Prints ONLY the song title and the artist of a song',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

// Initialize the OpenAI client
const OPEN_AI_KEY = ''


//Open AI key here 
const openai = new OpenAI({
  apiKey: OPEN_AI_KEY,
});

// Function to sanitize messages before sending them to OpenAI
function sanitizeMessages(messages) {
  return messages.map((msg) => {
    let sanitizedMsg = { role: msg.role };

    if (msg.content !== undefined && msg.content !== null) {
      sanitizedMsg.content = msg.content;
    }

    if (msg.name) {
      sanitizedMsg.name = msg.name;
    }

    if (msg.function_call) {
      sanitizedMsg.function_call = msg.function_call;
    }

    return sanitizedMsg;
  });
}

// Function to send user input and conversation history to OpenAI and get the response
const messageGPT = async (userInput, conversationHistory = []) => {
  // Add user input to conversation history
  if (userInput) {
    conversationHistory.push({ role: 'user', content: userInput });
  }

  try {
    const messages = [
      {
        role: 'system',
        content:
          'You are Beat Buddy, a music recommender. Guide the user and make playlists based on their inputs and suggestions. Use the available functions to get music data when necessary.',
      },
      ...conversationHistory,
    ];

    // Sanitize messages before sending
    const sanitizedMessages = sanitizeMessages(messages);

    // Call the OpenAI API with function definitions
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', 
      messages: sanitizedMessages,
      functions: functionDefinitions,
      function_call: 'auto', // Let the assistant decide when to call functions
      max_tokens: 250,
      temperature: 0.7,
    });

    // Get the assistant's response
    const responseMessage = completion.choices[0].message;

    // Check if the assistant wants to call a function
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);

      // Execute the corresponding function from MusicFunctions.js
      let functionResult;
      switch (functionName) {
        case 'searchTrack':
          functionResult = await searchTrack(
            functionArgs.songTitle,
            functionArgs.limit || 5
          );
          break;
        case 'getTrackInfo':
          functionResult = await getTrackInfo(
            functionArgs.artist,
            functionArgs.songTitle
          );
          break;
        case 'getAlbumInfo':
          functionResult = await getAlbumInfo(
            functionArgs.artist,
            functionArgs.albumTitle
          );
          break;
        case 'getRelatedTracks':
          functionResult = await getRelatedTracks(
            functionArgs.artist,
            functionArgs.songTitle,
            functionArgs.limit || 5
          );
          break;
        case 'searchAlbum':
          functionResult = await searchAlbum(
            functionArgs.albumTitle,
            functionArgs.limit || 5
          );
          break;
        case 'getTagsTopTracks':
          functionResult = await getTagsTopTracks(
            functionArgs.tag,
            functionArgs.limit || 5
          );
          break;
        case 'getTagsTopArtists':
          functionResult = await getTagsTopArtists(
            functionArgs.tag,
            functionArgs.limit || 5
          );
          break;
        case 'addToPlaylist':
          functionResult = await addToPlaylist(
            functionArgs.songTitle,
            functionArgs.artist
          );
          break;
        case 'deleteFromPlaylist':
          functionResult = await deleteFromPlaylist(
            functionArgs.songTitle,
            functionArgs.artist
          );
          break;
        case 'printPlaylist':
          functionResult = await printPlaylist();
          break;
        default:
          throw new Error(`Function ${functionName} is not implemented.`);
      }

      // Prepare the assistant's message
      let assistantMessage = {
        role: responseMessage.role,
      };

      if (responseMessage.content) {
        assistantMessage.content = responseMessage.content;
      }

      if (responseMessage.function_call) {
        assistantMessage.function_call = responseMessage.function_call;
      }

      conversationHistory.push(assistantMessage);

      // Add the function's result to the conversation history
      conversationHistory.push({
        role: 'function',
        name: functionName,
        content: JSON.stringify(functionResult),
      });

      // Sanitize conversation history before sending
      const sanitizedConversationHistory = sanitizeMessages(conversationHistory);

      // Call the model again to get the assistant's final response
      const completion2 = await openai.chat.completions.create({
        model: 'gpt-4o-mini', 
        messages: sanitizedConversationHistory,
        max_tokens: 75,
        temperature: 0.7,
      });

      const finalResponseMessage = completion2.choices[0].message;

      let finalAssistantMessage = {
        role: finalResponseMessage.role,
        content: finalResponseMessage.content,
      };

      // Add the final response to the conversation history
      conversationHistory.push(finalAssistantMessage);

      // Return the assistant's final response
      return {
        response: finalResponseMessage.content,
        conversationHistory,
      };
    } else {
      // No function call; proceed as usual
      let assistantMessage = {
        role: responseMessage.role,
        content: responseMessage.content,
      };
      conversationHistory.push(assistantMessage);

      return {
        response: responseMessage.content,
        conversationHistory,
      };
    }
  } catch (error) {
    console.error(
      'Error communicating with OpenAI:',
      error.response ? error.response.data : error.message
    );
    throw new Error('Failed to communicate with OpenAI.');
  }
};

module.exports = {
  messageGPT,
};
