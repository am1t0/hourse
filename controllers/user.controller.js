import { asyncHandler } from "../utils/asyncHandler.js";
import ApiError from '../utils/ApiError.js'
import User from '../modals/user.modal.js'
import ApiResponse from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'

// generating the tokens on 
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        console.log(error);
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    const { fullname, email, skills, username, password ,gitToken } = req.body;
   

    // validation - not empty
    if(skills.length==0)
    throw new ApiError(400, "All fields are required");

    
    if (
        [fullname, email, username, password,gitToken].some((field) =>
            field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }

    // check if user already exists: username , email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with this email or username already exists")
    }

    // create user object - create entry in db
    console.log('skills of this guy are : '+ skills);

    const user = await User.create({
        fullname,
        email,
        skills,
        password,
        username: username.toLowerCase(),
        gitToken
    })

    // add refresh token
    const {accessToken} = await generateAccessAndRefreshTokens(user._id);
    console.log("This is accessToken :",accessToken);

    // remove password and refresh token from response and
    // check user created or not 
    const createdUser = await User.findById(user._id).select(
        "-password"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    // check for user creation 
    // return response
    return res.status(201).json(
        new ApiResponse(201, {user: createdUser,accessToken}, "User registered Successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {

    // first take input form user , username or email, password
    const { username, email, password} = req.body;

    if (!username && !password) {
        throw new ApiError(400, "username or email is required")
    }

    // find user 
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    // user not present
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // password check 
    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
    }

    // access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // send cookie (containing access and refresh token) // here we can modify the object also
    const loggedInUser = await User.findById(user._id).
        select("-password -refreshToken")

    // with this frotend will not be able to change cooie!
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie('refreshToken', refreshToken)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser,
                    accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res) => {

    // updating the document of user by removing the refreshToken in database
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            // new:true means it returns updated document data
            new: true,
        }
    );

    // Now removing the data (refresh and access token ) from cookies too
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("refreshToken", options)
        .clearCookie("accessToken", options)
        .json(new ApiResponse(200, {}, "User logged out"))
})

// 
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try{
    // Checking validity of Refresh Token
    const decodedToken = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    )

    // finding user from database by the data(---id---) present in decoded token
    const user = await User.findById(decodedToken?._id);

    // user does not exists for that token
    if (!user) {
        throw new ApiError(401, "Invalid refresh token");
    }

    //  check if the user has expired its refresh token or not
    if (incomingRefreshToken !== user?.refreshToken) {
        return ApiError(401, 'Refresh token is expired or used')
    }

    const options ={
        httpOnly: true,
        secure: true,
    }

    // generating new tokens and saving refresh token in databse
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);


    // storing that tokens into cookies of user
    return res
    .status(200)
    .cookie("accessToken",accessToken ,options)
    .cookie('refreshToken',refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {accessToken,refreshToken},
          "Access token refreshed"
        )
    )
        }
        catch(error){
            return new ApiError(401, error?.message||"invalid refresh token")
        }

})

const getUserData = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id; // Assuming the user ID is available in req.user

        // Fetch user data from the database
        const user = await User.findById(userId).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        // Return the user data in the response
        return res.status(200).json(new ApiResponse(200, user, "User data retrieved successfully"));
    } catch (error) {
        console.error(error);
        throw new ApiError(500, "Something went wrong while fetching user data");
    }
});

const getGitToken = asyncHandler(async (req,res) => {
     const {userId} = req.params;

     try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { gitToken } = user;
    return res.status(200).json(new ApiResponse(200, {gitToken}, "User data retrieved successfully"));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
})

export { registerUser, loginUser, logoutUser,refreshAccessToken ,getUserData,getGitToken}