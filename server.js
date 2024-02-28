require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sdk = require("api")("@underdog/v2.0#1bkcoi35lscke5fs");
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

sdk.auth(process.env.sdkAUTH);
sdk.server(process.env.sdkSRV);

// mint
app.post('/mint', async (req, res) => {
  // const {  } = req.body;
  const { name, symbol, image, description,channelName } = req.body;
  const PublicKey = mongoose.model(`${channelName.toLowerCase()}s`, PublicKeySchema);
  console.log(req.body);
  // Fetch the public keys from the database
  const key = await PublicKey.find({});

  // Extract the public keys into an array
  const arr = key.map(doc => doc.key);
  console.log(arr);
  for (let i = 0; i < arr.length; i++) {
    await sdk
      .postV2ProjectsProjectidNfts(
        {
          receiverAddress: arr[i],
          name,
          symbol,
          description,
          image,
        },
        { projectId: 1 },
      )
      .then(({ data }) => console.log(data))
      .catch((err) => console.error(err));
  }

  res.send({ message: 'Done' });
});

app.post('/store-key', async (req, res) => {
  const { publicKey, channelName } = req.body;

  // Create a model from the schema with the channel name
  const PublicKey = mongoose.model(`${channelName.toLowerCase()}s`, PublicKeySchema);

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
  const appId = process.env.appID;
  const appCertificate = process.env.appCERT;
  const uid = 0;
  const userAccount = "host";
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

app.post('/create-db', async (req, res) => {
  const { channelName } = req.body;
  const PublicKey = mongoose.model(channelName, PublicKeySchema);

  // Create a dummy document in the collection
  const dummy = new PublicKey({ key: 'dummy' });
  await dummy.save();

  await PublicKey.deleteOne({ key: 'dummy' });

  res.json({ message: 'Database created successfully!' });
})

mongoose.connect(process.env.DB_URI)
    .then((result)=> {
        app.listen(5000, () => console.log('Server started on port 5000'));
    })
    .catch((err) => console.log(err))

