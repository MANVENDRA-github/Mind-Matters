import User from "../models/User.js";
import FriendRequest from "../models/FriendRequest.js";

export async function getRecommendedUsers(req, res) {
    try {
        const currentUserId = req.user.id;
        const currentUser = req.user;
        const cleanFriends = currentUser.friends.filter(id => id !== null);

        const recommendedUsers = await User.find({
            $and: [
                { _id: { $ne: currentUserId } }, //exclude current user
                { _id: { $nin: cleanFriends } }, //exclude current user friends
                {isOnboarded: true} // only include onboarded users
            ]
        })
        res.status(200).json(recommendedUsers);
    } catch (error) {
        console.error("Error in getRecommendedUsers controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getMyfriends(req, res) {
    try {
        const user = await User.findById(req.user.id)
            .select("friends")
            .populate("friends", "fullName profilePic nativeLanguage learningLanguages");

        // 🔥 Filter out null friends (deleted users)
        const safeFriends = (user.friends || []).filter(f => f !== null);

        res.status(200).json(safeFriends);
    } catch (error) {
        console.error("Error in getMyfriends controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}


export async function sendFriendRequest(req, res) {
    try {
        const myId = req.user.id;
        const { id: recipientId } = req.params;
        // Logic to send friend request from myId to recipientId

        //prevents sending request to myself

        if(myId === recipientId) {
            return res.status(400).json({ message: "You cannot send a friend request to yourself." });
        }

        const recipient = await User.findById(recipientId);
        if(!recipient) {
            return res.status(404).json({ message: "Recipient not found." });
        }
        // Further logic to create and save the friend request

        //check if user is already friends
        if(recipient.friends.includes(myId)) {
            return res.status(400).json({ message: "You are already friends with this user." });
        }

        //check if a req already exists
        const existingRequest = await FriendRequest.findOne({
            $or:[
                { sender: myId, recipient: recipientId },
                { sender: recipientId, recipient: myId }
            ]
        });

        if(existingRequest) {
            return res.status(400).json({ message: "A friend request already exists between you and this user." });
        }

        const friendRequest = await FriendRequest.create({
            sender: myId,
            recipient: recipientId
        });

        res.status(201).json(friendRequest);

    } catch (error) {
        console.error("Error in sendFriendRequest controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function acceptFriendRequest(req, res) {
    try {
        const {id: requestId} = req.params;

        // Logic to accept friend request with id requestId
        const friendRequest = await FriendRequest.findById(requestId);

        if(!friendRequest) {
            return res.status(404).json({ message: "Friend request not found." });
        }

        //Verify the current user is the recipient
        if(friendRequest.recipient.toString() !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to accept this friend request." });
        }

        friendRequest.status = "accepted";
        await friendRequest.save();

        //add each user to the other's friends list
        //$addToSet: adds element to array only if it doesn't already exist
        await User.findByIdAndUpdate(friendRequest.sender, {
            $addToSet: { friends: friendRequest.recipient } //add recipient to sender's friends list
        });


        await User.findByIdAndUpdate(friendRequest.recipient, {
            $addToSet: { friends: friendRequest.sender } //add sender to recipient's friends list
        });

        res.status(200).json({ message: "Friend request accepted." });
    } catch (error) {
        console.log("Error in acceptFriendRequest controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getFriendRequests(req, res) {
    try {
        const incomingReqs = await FriendRequest.find({
            recipient: req.user.id,
            status: "pending",
        }).populate("sender", "fullName profilePic nativeLanguage learningLanguages");

        const acceptedReqs = await FriendRequest.find({
            recipient: req.user.id,
            status: "accepted",
        }).populate("recipient", "fullName profilePic");

        res.status(200).json({ incomingReqs, acceptedReqs });
    } catch (error) {
        console.log("Error in getFriendRequests controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

export async function getOutgoingFriendReqs(req, res) {
    try {
        const outgoingRequests = await FriendRequest.find({
            sender: req.user.id,
            status: "pending",
        }).populate("recipient", "fullName profilePic nativeLanguage learningLanguages");

        //Remove requests with null recipients
        const safeOutgoing = outgoingRequests.filter(r => r.recipient !== null);

        res.status(200).json(safeOutgoing);
    } catch (error) {
       console.log("Error in getOutgoingFriendReqs controller", error.message);
       res.status(500).json({ message: "Internal Server Error" }); 
    }
}
