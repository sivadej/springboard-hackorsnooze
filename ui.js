$(async function () {
	// cache some selectors we'll be using quite a bit
	const $allStoriesList = $('#all-articles-list');
	const $submitForm = $('#submit-form');
	const $filteredArticles = $('#filtered-articles');
	const $loginForm = $('#login-form');
	const $createAccountForm = $('#create-account-form');
	const $ownStories = $('#my-articles');
	const $navLogin = $('#nav-login');
	const $navLogOut = $('#nav-logout');
	const $navFavorites = $('#nav-favorites');
	const $navOwnStories = $('#nav-ownstories');
	const $navSubmit = $('#nav-submit');
	const $navProfile = $('#nav-profile');

	$('#user-profile').hide();

	// global storyList variable
	let storyList = null;

	// global currentUser variable
	let currentUser = null;

	await checkIfLoggedIn();

	// Click handlers applied to main list, favorites, and own stories lists
	$('#all-articles-list, #filtered-articles, #my-articles').on('click', async function (e) {
		if (e.target.classList.contains('toggle-fav')) {
			e.preventDefault();
			if (currentUser.isFavorite(e.target.parentElement.id)) {
				currentUser.removeFavorite(e.target.parentElement.id);
				e.target.classList.replace('fa-star', 'fa-star-o');
			}
			else {
				currentUser.addFavorite(e.target.parentElement.id);
				e.target.classList.replace('fa-star-o', 'fa-star');
			}
		}
		if (e.target.classList.contains('delete-icon')) {
			e.preventDefault();
			currentUser.removeStory(e.target.parentElement.id);
			e.target.parentElement.remove();
		}
	});

	$submitForm.on('submit', async function (evt) {
		evt.preventDefault(); // no page-refresh on submit

		// get author, title, url from input fields
		const author = $('#author').val();
		const title = $('#title').val();
		const url = $('#url').val();

		// only perform actions if a user is logged in with valid token
		if (currentUser) {
			//use token and form data to create object for passing to addStory()
			const newStory = {
				token: currentUser.loginToken,
				story: {
					author,
					title,
					url
				}
			};

			// use API POST in addStory() to create new story on server,
			// then return instance of Story class using Response data
			const storyObj = await storyList.addStory(currentUser.loginToken, newStory);
			await currentUser.reloadOwnStories();

			// Use storyObj to generate HTML for new story. Prepend to stories list
			//const newStoryHTML = generateStoryHTML(storyObj);
			//$allStoriesList.prepend(newStoryHTML);

			// Reset and hide form
			$submitForm.slideToggle();

			hideElements();
			await generateStories();
			$allStoriesList.show();
		}
	});

	/**
	 * Event listener for logging in.
	 *  If successfully we will setup the user instance
	 */

	$loginForm.on('submit', async function (evt) {
		evt.preventDefault(); // no page-refresh on submit

		// grab the username and password
		const username = $('#login-username').val();
		const password = $('#login-password').val();

		// call the login static method to build a user instance
		const userInstance = await User.login(username, password);
		// set the global user to the user instance
		currentUser = userInstance;
		await generateStories();
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
		fillProfile();
	});

	/**
	 * Event listener for signing up.
	 *  If successfully we will setup a new user instance
	 */

	$createAccountForm.on('submit', async function (evt) {
		evt.preventDefault(); // no page refresh

		// grab the required fields
		let name = $('#create-account-name').val();
		let username = $('#create-account-username').val();
		let password = $('#create-account-password').val();

		// call the create method, which calls the API and then builds a new user instance
		const newUser = await User.create(username, password, name);
		currentUser = newUser;
		syncCurrentUserToLocalStorage();
		loginAndSubmitForm();
	});

	/**
	 * Log Out Functionality
	 */

	$navLogOut.on('click', function () {
		// empty out local storage
		localStorage.clear();
		// refresh the page, clearing memory
		location.reload();
	});

	/**
	 * Event Handler for Clicking Login
	 */

	$navLogin.on('click', function () {
		// Show the Login and Create Account Forms
		$loginForm.slideToggle();
		$createAccountForm.slideToggle();
		$allStoriesList.toggle();
	});

	$navFavorites.on('click', async function () {
		// Show the favorites list
		$allStoriesList.hide();
		$ownStories.hide();
		await generateStories();
		await generateFavorites();
		$filteredArticles.show();
	});

	$navOwnStories.on('click', async function () {
		// Show the favorites list
		$allStoriesList.hide();
		$filteredArticles.hide();
		await generateStories();
		await generateOwnStories();
		$ownStories.show();
	});

	$navSubmit.on('click', function () {
		// Show the new story submission form
		$submitForm.slideToggle();
	});

	$navProfile.on('click', function () {
		$('#user-profile').slideToggle();
	})

	/**
	 * Event handler for Navigation to Homepage
	 */

	$('body').on('click', '#nav-all', async function () {
		hideElements();
		await generateStories();
		$allStoriesList.show();
	});

	/**
	 * On page load, checks local storage to see if the user is already logged in.
	 * Renders page information accordingly.
	 */

	async function checkIfLoggedIn() {
		// let's see if we're logged in
		const token = localStorage.getItem('token');
		const username = localStorage.getItem('username');

		// if there is a token in localStorage, call User.getLoggedInUser
		//  to get an instance of User with the right details
		//  this is designed to run once, on page load
		currentUser = await User.getLoggedInUser(token, username);
		await generateStories();

		if (currentUser) {
			showNavForLoggedInUser();
			fillProfile();
		}
	}

	function fillProfile() {
		if (currentUser) {
			console.log('filling profile');
			document.getElementById('profile-name').append(currentUser.name);
			document.getElementById('profile-username').append(currentUser.username);
			convertedDate = new Date(currentUser.createdAt).toDateString();
			document.getElementById('profile-account-date').append(convertedDate);
		}
	}

	/**
	 * A rendering function to run to reset the forms and hide the login info
	 */

	function loginAndSubmitForm() {
		// hide the forms for logging in and signing up
		$loginForm.hide();
		$createAccountForm.hide();

		// reset those forms
		$loginForm.trigger('reset');
		$createAccountForm.trigger('reset');

		// show the stories
		$allStoriesList.show();

		// update the navigation bar
		showNavForLoggedInUser();
	}

	/**
	 * A rendering function to call the StoryList.getStories static method,
	 *  which will generate a storyListInstance. Then render it.
	 */

	async function generateStories() {
		// get an instance of StoryList
		const storyListInstance = await StoryList.getStories();
		// update our global variable
		storyList = storyListInstance;
		// empty out that part of the page
		$allStoriesList.empty();

		// loop through all of our stories and generate HTML for them
		for (let story of storyList.stories) {
			const result = generateStoryHTML(story);
			$allStoriesList.append(result);
		}
	}

	async function generateFavorites() {
		$filteredArticles.empty();
		console.log('generating favorites... ');
		const favsList = await storyList.stories.filter(story => currentUser.isFavorite(story.storyId));
		for (let story of favsList) {
			$filteredArticles.append(generateStoryHTML(story));
		}
	}

	async function generateOwnStories() {
		$ownStories.empty();
		console.log('generating own stories... ');
		const ownList = await storyList.stories.filter(story => currentUser.isOwnStory(story.storyId));
		for (let story of ownList) {
			$ownStories.append(generateStoryHTML(story));
		}
	}

	/**
	 * A function to render HTML for an individual Story instance
	 */

	function generateStoryHTML(story) {
		let hostName = getHostName(story.url);

		let markupIfFavorite = '';
		let markupIfOwnStory = '';

		// render story markup but only show "favorite" and "delete" icons when logged in

		if (currentUser) {
			markupIfFavorite = `<i class="toggle-fav fa ${currentUser.isFavorite(story.storyId) ? 'fa-star' : 'fa-star-o'}"></i>`;
			markupIfOwnStory = `${currentUser.isOwnStory(story.storyId) ? '<i class="fa fa-trash delete-icon"></i>' : ''}`;
		}

		const storyMarkup = $(`
	  <li id="${story.storyId}">
	  ${markupIfFavorite} ${markupIfOwnStory}
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
		<small class="article-username">posted by ${story.username}</small>
		
      </li>
	`);

		return storyMarkup;
	}

	/* hide all elements in elementsArr */

	function hideElements() {
		const elementsArr = [
			$submitForm,
			$allStoriesList,
			$filteredArticles,
			$ownStories,
			$loginForm,
			$createAccountForm
		];
		elementsArr.forEach($elem => $elem.hide());
	}

	function showNavForLoggedInUser() {
		$navLogin.hide();
		$navLogOut.show();
		$navFavorites.show();
		$navOwnStories.show();
		$navSubmit.show();
		$navProfile.show();
	}

	/* simple function to pull the hostname from a URL */

	function getHostName(url) {
		let hostName;
		if (url.indexOf('://') > -1) {
			hostName = url.split('/')[2];
		}
		else {
			hostName = url.split('/')[0];
		}
		if (hostName.slice(0, 4) === 'www.') {
			hostName = hostName.slice(4);
		}
		return hostName;
	}

	/* sync current user information to localStorage */

	function syncCurrentUserToLocalStorage() {
		if (currentUser) {
			localStorage.setItem('token', currentUser.loginToken);
			localStorage.setItem('username', currentUser.username);
		}
	}
});