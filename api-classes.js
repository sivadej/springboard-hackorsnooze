const BASE_URL = 'https://hack-or-snooze-v3.herokuapp.com';

/**
 * This class maintains the list of individual Story instances
 *  It also has some methods for fetching, adding, and removing stories
 */

class StoryList {
	constructor(stories) {
		this.stories = stories;
	}

	/**
   * This method is designed to be called to generate a new StoryList.
   *  It:
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.*
   */

	static async getStories() {
		// query the /stories endpoint (no auth required)
		const response = await axios.get(`${BASE_URL}/stories`);

		// turn the plain old story objects from the API into instances of the Story class
		const stories = response.data.stories.map(story => new Story(story));

		// build an instance of our own class using the new array of stories
		const storyList = new StoryList(stories);
		return storyList;
	}

	/**
   * Method to make a POST request to /stories and add the new story to the list
   * - user - the current instance of User who will post the story
   * - newStory - a new story object for the API with title, author, and url
   *
   * Returns the new story object
   */

	async addStory(user, newStory) {
		const response = await axios.post(`${BASE_URL}/stories`, {
			token: user,
			story: newStory.story
		});
		newStory = new Story(response.data.story);
		return newStory;
	}
}

/**
 * The User class to primarily represent the current user.
 *  There are helper methods to signup (create), login, and getLoggedInUser
 */

class User {
	constructor(userObj) {
		this.username = userObj.username;
		this.name = userObj.name;
		this.createdAt = userObj.createdAt;
		this.updatedAt = userObj.updatedAt;

		// these are all set to defaults, not passed in by the constructor
		this.loginToken = '';
		this.favorites = [];
		this.ownStories = [];
	}

	/* Create and return a new user.
   *
   * Makes POST request to API and returns newly-created user.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

	static async create(username, password, name) {
		const response = await axios.post(`${BASE_URL}/signup`, {
			user: {
				username,
				password,
				name
			}
		});

		// build a new User instance from the API response
		const newUser = new User(response.data.user);

		// attach the token to the newUser instance for convenience
		newUser.loginToken = response.data.token;

		return newUser;
	}

	/* Login in user and return user instance.

   * - username: an existing user's username
   * - password: an existing user's password
   */

	static async login(username, password) {
		const response = await axios.post(`${BASE_URL}/login`, {
			user: {
				username,
				password
			}
		});

		// build a new User instance from the API response
		const existingUser = new User(response.data.user);

		// instantiate Story instances for the user's favorites and ownStories
		existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
		existingUser.ownStories = response.data.user.stories.map(s => new Story(s));

		// attach the token to the newUser instance for convenience
		existingUser.loginToken = response.data.token;

		return existingUser;
	}

	/** Get user instance for the logged-in-user.
   *
   * This function uses the token & username to make an API request to get details
   *   about the user. Then it creates an instance of user with that info.
   */

	static async getLoggedInUser(token, username) {
		// if we don't have user info, return null
		if (!token || !username) return null;

		// call the API
		const response = await axios.get(`${BASE_URL}/users/${username}`, {
			params: {
				token
			}
		});

		// instantiate the user from the API information
		const existingUser = new User(response.data.user);

		// attach the token to the newUser instance for convenience
		existingUser.loginToken = token;

		// instantiate Story instances for the user's favorites and ownStories
		existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
		existingUser.ownStories = response.data.user.stories.map(s => new Story(s));
		return existingUser;
	}

	// Methods to favorite/unfavorite a story. Story remains favorited on refresh.
	// Changes should be reflected on page
	async addFavorite(storyId) {
		const response = await axios.post(
			`${BASE_URL}/users/${this.username}/favorites/${storyId}?token=${this.loginToken}`
		);
		this.reloadFavorites(response.data.user.favorites);
		console.log('favorite added');
	}

	async removeFavorite(storyId) {
		const response = await axios.delete(
			`${BASE_URL}/users/${this.username}/favorites/${storyId}?token=${this.loginToken}`
		);
		this.reloadFavorites(response.data.user.favorites);
	}

	// Sync changes made via API to current instance of User
	async reloadOwnStories() {
		const response = await axios.get(`${BASE_URL}/users/${this.username}?token=${this.loginToken}`);
		this.ownStories = response.data.user.stories;
	}

	// Delete story using API DELETE call with user token and story id 
	async removeStory(id) {
		const response = await axios.delete(`${BASE_URL}/stories/${id}?token=${this.loginToken}`);
	}

	// Check if storyId passed in belongs to the currently logged in User
	isOwnStory(id) {
		for (let story of this.ownStories) {
			if (id === story.storyId) return true;
		}
	}

	// Check if storyId passed in was favorited by logged in User
	isFavorite(storyId) {
		for (let fav of this.favorites) {
			if (storyId === fav.storyId) return true;
		}
	}

	reloadFavorites(favs) {
		this.favorites = favs;
	}
}

/**
 * Class to represent a single story.
 */

class Story {
	/**
   * The constructor is designed to take an object for better readability / flexibility
   * - storyObj: an object that has story properties in it
   */

	constructor(storyObj) {
		this.author = storyObj.author;
		this.title = storyObj.title;
		this.url = storyObj.url;
		this.username = storyObj.username;
		this.storyId = storyObj.storyId;
		this.createdAt = storyObj.createdAt;
		this.updatedAt = storyObj.updatedAt;
	}
}
