require('dotenv').config();


const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const {
  RtcTokenBuilder,
  RtmTokenBuilder,
  RtcRole,
  RtmRole,
} = require("agora-token");

const app = express();
app.use(cors());
app.use(express.json());
// Define a schema for the public key
const PublicKeySchema = new mongoose.Schema({ key: String });
// Connect to your MongoDB database
// mongoose.connect('mongodb+srv://favour:passwordd@cluster0.pebhzxv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',);


app.post('/store-key', async (req, res) => {
  const { publicKey, channelName } = req.body;

  // Create a model from the schema with the channel name
  const PublicKey = mongoose.model(channelName, PublicKeySchema);

  // Check if a document with the given public key already exists
  const existingKey = await PublicKey.findOne({ key: publicKey });

  if (existingKey) {
    // If the public key already exists, send a response back to the client
    res.send({ message: 'Public key already exists!' });
    console.log('Public key already exists!');
  } else {
    // If the public key doesn't exist, create a new document
    const key = new PublicKey({ key: publicKey });

    // Save the new document to the database
    await key.save();

    // Send a response back to the client
    res.send({ message: 'Public key stored successfully!' });
    console.log('Public key stored successfully!');
  }
});


//delete endpoints
app.delete('/delete-key', async (req, res) => {
    const { publicKey, channelName } = req.body;
    
  
    // Get the model for the channel
    const PublicKey = mongoose.model(channelName, PublicKeySchema);
  
    // Delete the document from the database
    await PublicKey.deleteOne({ key: publicKey });
  
    // Send a response back to the client
    res.send({ message: 'Public key deleted successfully!' });
    console.log('Public key deleted successfully!');
  });

const generateRtcToken = (channelName) => {
  const appId = "69c3c885e2ef4de5995793276cf21683";
  const appCertificate = "19f2af98d0994da3b887d3083c673e09";
  const uid = 0;
  const userAccount = "test_user_id";
  const role = RtcRole.PUBLISHER;

  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const tokenA = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    role,
    expirationTimeInSeconds,
    privilegeExpiredTs,
  );
  console.log("Token With Integer Number Uid: " + tokenA);

  const tokenB = RtcTokenBuilder.buildTokenWithUserAccount(
    appId,
    appCertificate,
    channelName,
    userAccount,
    role,
    privilegeExpiredTs,
  );
  console.log("Token With UserAccount: " + tokenB);

  return tokenA; // or return tokenB if you want to use the token generated with user account
};

//chck if the channel already exists
app.get('/collection-exists', async (req, res) => {
  const { channelName } = req.query;

  // Check if a collection with the given name exists
  const collectionNames = await mongoose.connection.db.listCollections().toArray();
  const collectionExists = collectionNames.some(collection => collection.name === `${channelName.toLowerCase()}s`);

  // Send a response back to the client
  res.send({ collectionExists });
});


// generate the token
app.post('/generate-token', async (req, res) => {
  const channelName = req.body.channelName;
  const token = generateRtcToken(channelName);

  // Create a model from the schema with the channel name
  const PublicKey = mongoose.model(channelName, PublicKeySchema);

  // Create a dummy document in the collection
  const dummy = new PublicKey({ key: 'dummy' });
  await dummy.save();

  // Immediately delete the dummy document
  await PublicKey.deleteOne({ key: 'dummy' });

  res.json({ token });
});

mongoose.connect(process.env.DB_URI)
    .then((result)=> {
        app.listen(5000, () => console.log('Server started on port 5000'));
    })
    .catch((err) => console.log(err))

