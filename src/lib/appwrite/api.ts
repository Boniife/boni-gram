import { ID, Query } from 'appwrite';

import { INewPost, INewUser, IUpdatePost } from "@/types";
import { account, avatars, databases, storage } from './config';

export async function createUserAccount(user: INewUser) {
    try {
        const newAccount = await account.create(
            ID.unique(),
            user.email,
            user.password,
            user.name,
        );
            console.log(newAccount); 
         if(!newAccount) throw Error;

        const avatarUrl = avatars.getInitials(user.name);

        const newUser = await saveUserToDB({
            accountId: newAccount.$id,
            name: newAccount.name,
            email: newAccount.email,
            username: user.username,
            imageUrl: avatarUrl,
        });

        return newUser;
    } catch (error) {
        console.log(error)
        return error;
    }
}

export async function saveUserToDB(user: {
    accountId: string;
    email: string;
    name: string;
    imageUrl: URL;
    username?: string;
}) {
    try {
        const newUser = await databases.createDocument(
            '65ab85035183ca23f2f8', // database id
            '65ab867d8e32da67d710', // user collection id
            ID.unique(),
            user
        );

        return newUser;
    } catch (error) {
        console.log(error);
    }
}

export async function signInAccount(user: {
    email: string;
    password: string;
}) {
    try {
        const session = await account.createEmailSession(user.email, user.password);
       
        return session;
    } catch (error) {
        console.log(error);
    }
}

export async function getCurrentUser() {
    try {
        const currentAccount = await account.get();
        if(!currentAccount) throw Error;

        const currentUser = await databases.listDocuments(
            '65ab85035183ca23f2f8', // database id
            '65ab867d8e32da67d710', // user collection id
            [Query.equal('accountId', currentAccount.$id)]
        )
        if(!currentUser) throw Error;

        return currentUser.documents[0];
    } catch (error) {
        console.log(error)
    }
}

export async function signOutAccount() {
    try {
        const session = await account.deleteSession('current');

        return session;
    } catch (error) {
        console.log(error)
    }
}

export async function createPost(post: INewPost) {
    try {
        // upload image to storage
        const uploadedFile = await uploadFile(post.file[0]);
        if(!uploadedFile) throw Error;

        // Get file url
        const fileUrl = await getFilePreview(uploadedFile.$id);
            // console.log(`file url:,  ${fileUrl}`)
        if(!fileUrl) {
            deleteFile(uploadedFile.$id);
            throw Error;
        }
        
        // convert tags in an array
        const tags = post.tags?.replace(/ /g,'').split(',') || [];

        // save post to database
        const newPost = await databases.createDocument(
            // database id
            '65ab85035183ca23f2f8',
            //post collection id
            '65ab85c6dd1afe2713cd',
            ID.unique(),
            {
                creator: post.userId,
                caption: post.caption,
                imageUrl: fileUrl,
                imageId: uploadedFile.$id,
                location: post.location,
                tags: tags
            }
        )
        if(!newPost) {
            await deleteFile(uploadedFile.$id)
            throw Error;
        }

        return newPost
    } catch (error) {
        console.log(error)
    }
}

export async function uploadFile(file: File) {
    try {
       const uploadedFile = await storage.createFile(
        // storage id
        '65ab8413993cafa28fab',
        ID.unique(),
        file
       ); 

       return uploadedFile;
    } catch (error) {
        console.log(error)
    }
}

export function getFilePreview(fileId: string) {
    
    try {
       const fileUrl = storage.getFilePreview(
        // storage id
        '65ab8413993cafa28fab',
        fileId,
        2000,
        2000,
        'top',
        100
       )
       return fileUrl;

    } catch (error) {
        console.log(error);
    }
}

export async function deleteFile(fileId: string) {
    try {
        await storage.deleteFile('65ab8413993cafa28fab', fileId);

        return {status: 'ok'}
    } catch (error) {
        console.log(error)
    }
}

export async function getRecentPosts() {
    const posts = await databases.listDocuments(
        // database id
        '65ab85035183ca23f2f8',
        // postCollection id
        '65ab85c6dd1afe2713cd',
        [Query.orderDesc('$createdAt'), Query.limit(20)]
    )

    if(!posts) throw Error;
    
    return posts;
}

export async function likePost(postId: string, likesArray: string[]) {
    try {
        const updatedPost = await databases.updateDocument(
            // database id
            '65ab85035183ca23f2f8',
            // post collection id
            '65ab85c6dd1afe2713cd',
            postId,
            {
                likes: likesArray
            }
        )

        if(!updatedPost) throw Error;
        
        return updatedPost
    } catch (error) {
        console.log(error)
    }
}

export async function savePost(postId: string, userId: string) {
    try {
        const updatedPost = await databases.createDocument(
            // database id
            '65ab85035183ca23f2f8',
            // saves collection id
            '65ab86c2b3d73cfb76f6',
            ID.unique(),
            {
                user: userId,
                post: postId,  
            }
        )

        if(!updatedPost) throw Error;

        return updatedPost
    } catch (error) {
        console.log(error)
    }
}

export async function deleteSavedPost(savedRecordId: string) {
    try {
        const statusCode = await databases.deleteDocument(
            // database id
            '65ab85035183ca23f2f8',
            // saves collection id
            '65ab86c2b3d73cfb76f6',
            savedRecordId,
        )

        if(!statusCode) throw Error;

        return {status: 'ok'}
    } catch (error) {
        console.log(error)
    }
}

export async function getPostById(postId: string) {
    try {
        const post = await databases.getDocument(
        // database id
       '65ab85035183ca23f2f8',
       // post collection id
       '65ab85c6dd1afe2713cd',
       postId 
        )
        return post;
        
    } catch (error) {
        console.log(error)
    }
}

export async function updatePost(post: IUpdatePost) {
    const hasFileToUpdate = post.file.length > 0;

    try {
        let image = {
            imageUrl: post.imageUrl,
            imageId: post.imageId,
        }

        if(hasFileToUpdate) {
            // upload image to storage
         const uploadedFile = await uploadFile(post.file[0]);
         if(!uploadedFile) throw Error;

         // Get file url
         const fileUrl = await getFilePreview(uploadedFile.$id);
         if(!fileUrl) {
             deleteFile(uploadedFile.$id);
             throw Error;
         }

         image = {...image, imageUrl: fileUrl, imageId: uploadedFile.$id}
        } 

        
        // convert tags in an array
        const tags = post.tags?.replace(/ /g,'').split(',') || [];

        // save post to database
        const updatedPost = await databases.updateDocument(
            // database id
            '65ab85035183ca23f2f8',
            //post collection id
            '65ab85c6dd1afe2713cd',
            post.postId,
            {
                caption: post.caption,
                imageUrl: image.imageUrl,
                imageId: image.imageId,
                location: post.location,
                tags: tags
            }
        )
        if(!updatedPost) {
            await deleteFile(post.imageId)
            throw Error;
        }

        return updatedPost
    } catch (error) {
        console.log(error)
    }
}

export async function deletePost(postId: string, imageId: string) {
    if(!postId || imageId) throw Error;

    try {
        await databases.deleteDocument(
            //database id
            '65ab85035183ca23f2f8',
            // post collection id
            '65ab85c6dd1afe2713cd',
            postId
        )

        return { status: 'ok'}
    } catch (error) {
        console.log(error)
    }
}