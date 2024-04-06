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
const RoomSchema = new mongoose.Schema({ roomName: String, password: String, creator: String });
const ProfileSchema = new mongoose.Schema({ username: String, email: String, imageurl: String, key: String });
const RoomLinkSchema = new mongoose.Schema({ roomName: String, RSVPlink: String, roomLink: String, owner: String });

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
        { projectId: 3 },
      )
      .then(({ data }) => console.log(data))
      .catch((err) => console.error(err));
  }

  res.send({ message: 'Done' });
});

app.post('/store-key', async (req, res) => {
  const { publicKey, channelName } = req.body;

  // Create a model from the schema with the channel name
  const PublicKey = mongoose.model(`${channelName.toLowerCase()}rsvps`, PublicKeySchema);

  // Check if a document with the given public key already exists
  const existingKey = await PublicKey.findOne({ key: publicKey });

  if (existingKey) {
    // If the public key already exists, send a response back to the client
    res.send({ message: 'Public key already exists!',status:400 });
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
app.post('/nft-apply', async (req, res) => {
  const { publicKey, channelName } = req.body;

  // Create a model from the schema with the channel name
  const PublicKey = mongoose.model(`${channelName.toLowerCase()}s`, PublicKeySchema);

  // Check if a document with the given public key already exists
  const existingKey = await PublicKey.findOne({ key: publicKey });

  if (existingKey) {
    // If the public key already exists, send a response back to the client
    res.send({ message: 'Public key already exists!',status:400 });
    console.log('Public key already exists!');
  } else {
    // If the public key doesn't exist, create a new document
    const key = new PublicKey({ key: publicKey });

    // Save the new document to the database
    await key.save();

    // Send a response back to the client
    res.send({ message: 'Public key stored successfully!', status: 200 });
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
});

app.post('/store-password', async (req, res) => {
  const { password, channelName, creator } = req.body;
  const Room = mongoose.model('rooms', RoomSchema);
  const room = new Room({ roomName: channelName, password, creator});
  await room.save();

  res.json({ message: 'Room stored successfully!' });
})

app.post('/check-password', async (req, res) => {
  const { password, channelName } = req.body;
  const Room = mongoose.model('rooms', RoomSchema);
  console.log(password, channelName);
  const room = await Room.findOne({ roomName: channelName, password: password });
  if (room) {
    res.json({ status: 200 });
  } else {
    res.json({ status: 400 });
  }
})

app.post('/checkRSVP', async (req, res) => {
  // console.log('sui');
  const { publicKey, channelName } = req.body;
  const PublicKey = mongoose.model(`${channelName.toLowerCase()}rsvps`, PublicKeySchema);
  const key = await PublicKey.findOne({ key: publicKey });
  if (key) {
    res.json({ status: 200 });
  } else {
    res.json({ status: 400 });
  }
})

app.post('/ownercheck', async (req, res) => {
  const { creator, channelName } = req.body;
  const Room = mongoose.model('rooms', RoomSchema);
  const room = await Room.findOne({ roomName: channelName.toLowerCase(), creator: creator });
  if (room) {
    res.json({ status: 200 });
  } else {
    res.json({ status: 400 });
  }
})

app.post('/countParticipants', async (req, res) => {
  const { channelName } = req.body;
  const Publickey = mongoose.model(`${channelName.toLowerCase()}s`, PublicKeySchema);
  const count = await Publickey.countDocuments();
  res.json({ count });
})

app.post('/countRSVPs', async (req, res) => {
  const { channelName } = req.body;
  const Publickey = mongoose.model(`${channelName.toLowerCase()}rsvps`, PublicKeySchema);
  const count = await Publickey.countDocuments();
  res.json({ count });
})

app.post('/delete', async (req, res) => {
  const { channelName } = req.body;
  const Room = mongoose.model('rooms', RoomSchema);
  await Room.deleteOne({ roomName: channelName });
  const PublicKey = mongoose.model(`${channelName.toLowerCase()}s`, PublicKeySchema);
  await PublicKey.collection.drop();
  const PublickeyRSVP = mongoose.model(`${channelName.toLowerCase()}rsvps`, PublicKeySchema);
  await PublickeyRSVP.collection.drop();
  const RoomLink = mongoose.model('roomlinks', RoomLinkSchema);
  await RoomLink.deleteOne({ roomName: channelName });
  res.json({ message: 'Database deleted successfully!' });
})

app.post('/create-profile', async (req, res) => {
  let { username, email, imageurl, key } = req.body;
  if (!imageurl) {
    imageurl = 'https://i.imgur.com/gJnwif2.jpeg';
  }
  const Profile = mongoose.model('profiles', ProfileSchema);
  const profile = new Profile({ username, email, imageurl, key });
  await profile.save();
  res.json({ status: 200 });
})

app.get('/check-profile', async (req, res) => {
  const { key } = req.query;
  const Profile = mongoose.model('profiles', ProfileSchema);
  const profile = await Profile.findOne({ key });
  if (profile) {
    res.json({ status: 200 });
  } else {
    res.json({ status: 400 });
  }
})

app.get('/get-profile', async (req, res) => {
  const { key } = req.query;
  const Profile = mongoose.model('profiles', ProfileSchema);
  const profile = await Profile.findOne({ key });
  res.json({ profile });
})

app.post('/store-links', async (req, res) => {
  const { owner, roomName, RSVPlink, roomLink } = req.body;
  const RoomLink = mongoose.model('roomlinks', RoomLinkSchema);
  const link = new RoomLink({ owner, roomName, RSVPlink, roomLink });
  await link.save();
  res.json({ status: 200 });
})

app.get('/get-links', async (req, res) => {
  const { roomName } = req.query;
  const RoomLink = mongoose.model('roomlinks', RoomLinkSchema);
  const link = await RoomLink.findOne({ roomName });
  if (link) {
    res.json({ link, status: 200 });
  } else {
    res.json({ status: 400 });
  }
})

app.get('/get-rooms', async (req, res) => {
  const { creator } = req.query;
  const Room = mongoose.model('rooms', RoomSchema);
  const rooms = await Room.find({creator});
  res.json({ rooms });
})

app.get('/get-rsvps', async (req, res) => {
  const { roomName } = req.query;
  const PublicKey = mongoose.model(`${roomName.toLowerCase()}rsvps`, PublicKeySchema);
  const rsvps = await PublicKey.find({});
  res.json({ rsvps });
})

app.get('/get-participants', async (req, res) => {
  const { roomName } = req.query;
  const PublicKey = mongoose.model(`${roomName.toLowerCase()}s`, PublicKeySchema);
  const participants = await PublicKey.find({});
  res.json({ participants });
})

app.get('/get-image-url', async (req, res) => {
  const { key } = req.query;
  const Profile = mongoose.model('profiles', ProfileSchema);
  const profile = await Profile.findOne({ key });
  if (!profile) {
    res.json({ status: 400 });
    return
  }
  res.json({ img: profile.imageurl, status: 200 });
})

app.get('/check-roomLink', async (req, res) => {
  const { roomLink } = req.query;
  const RoomLink = mongoose.model('roomlinks', RoomLinkSchema);
  const link = await RoomLink.findOne({ roomLink });
  if (link) {
    res.json({ status: 200 });
  } else {
    res.json({ status: 400 });
  }
})

app.get('/check-publickey' , async (req, res) => {
  const { key } = req.query;
  const Profile = mongoose.model('profiles', ProfileSchema);
  const profile = await Profile.findOne({ key });
  if (profile) {
    res.json({ status: 200 });
  } else {
    res.json({ status: 400 });
  }
})

app.post('/update-profile', async (req, res) => {
  const { username, email, imageurl, key } = req.body;
  const Profile = mongoose.model('profiles', ProfileSchema);
  const profile = await Profile.findOne({ key });
  if (username) {
    profile.username = username;
  }
  if (email) {
    profile.email = email;
  }
  if (imageurl) {
    profile.imageurl = imageurl;
  }
  await profile.save();
  res.json({ status: 200 });
})

mongoose.connect(process.env.DB_URI)
    .then((result)=> {
        app.listen(5000, () => console.log('Server started on port 5000'));
    })
    .catch((err) => console.log(err))