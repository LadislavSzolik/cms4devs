import './css/index.css'

// Navigation
// -----------------------------------------------------------------
const sidenav = document.querySelector('#sidenav-open')
const closenav = document.querySelector('#sidenav-close')
const opennav = document.querySelector('#sidenav-button')

// set focus to our open/close buttons after animation
sidenav.addEventListener('transitionend', (e) => {
  if (e.propertyName !== 'transform') return

  const isOpen = document.location.hash === '#sidenav-open'

  isOpen ? closenav.focus() : opennav.focus()

  if (!isOpen) {
    history.replaceState(history.state, '')
  }
})

// close our menu when esc is pressed
sidenav.addEventListener('keyup', (e) => {
  if (e.code === 'Escape')
    window.history.length
      ? window.history.back()
      : (document.location.hash = '')
})

// -----------------------------------------------------------------
// Core functionality
// -----------------------------------------------------------------
import { Octokit } from 'https://cdn.skypack.dev/@octokit/core'

// Get screen elements
const mainTitle = document.querySelector('#main-title')
const notificationText = document.querySelector('#notification')

const gitDirectoryPath = document.querySelector('#git-directory-path')
const contentPathText = document.querySelector('#content-path')
const directoryDiv = document.querySelector('#directory')
const newFileNameText = document.querySelector('#newfilename')
const contentTextArea = document.querySelector('#blog-area')
const contentPreview = document.querySelector('#blog-preview')

const gitMessageTextfield = document.querySelector('#git-message')

// HTML Templates
const directoryBtnTemplate = document.querySelector('#directory-btn')
const directoryBtnNewTemplate = document.querySelector('#directory-btn-new')

const loadGitDirectoryBtn = document.querySelector('#load-gitdir-btn')
const refreshGitDirectoryBtn = document.querySelector('#refresh-gitdir-btn')
const editBtn = document.querySelector('#edit-btn')
const previewBtn = document.querySelector('#preview-btn')

var appVars = {
  octokitAPIUrl: '/repos/{owner}/{repo}/contents/{path}',
  currentlyOpenFilePath: null,
  currentlyOpenFileSha: null,
  gitToken: null,
  gitOwner: null,
  gitRepo: null,
  octokit: null
}

// Capture the new file name.
newFileNameText.addEventListener('change', (event) => {
  appVars.currentlyOpenFilePath =
    contentPathText.value + '/' + event.target.value
})

/******************************************************************************/
/* GET ALL FILES*/
/******************************************************************************/
function loadGitRepository() {
  directory.innerHTML = 'Loading...'

  var octokitRequestOptions = {
    owner: appVars.gitOwner,
    repo: appVars.gitRepo,
    path: contentPathText.value
  }

  callOctokit(
    'GET',
    appVars.octokitAPIUrl,
    octokitRequestOptions,
    onGetDirectoryCallback
  )
}

function onGetDirectoryCallback(response) {
  // clear directory list
  directory.innerHTML = ''

  setGitDirectory(contentPathText.value)

  createNewButton()

  response.data.map((content) => {
    var buttonTemplate = directoryBtnTemplate.content.cloneNode(true)
    var button = buttonTemplate.querySelector('button')

    button.dataset.path = content.path
    button.dataset.sha = content.sha
    button.dataset.name = content.name

    var buttonText = buttonTemplate.querySelector('span')
    buttonText.textContent = content.name

    button.addEventListener('click', (event) => {
      notify('hidden', '')

      closeSideNav()

      mainTitle.classList.remove('hidden')
      newFileNameText.classList.add('hidden')

      editBtn.classList.add('hidden')
      previewBtn.classList.remove('hidden')

      setPageTitle(event.target.dataset.name)
      appVars.currentlyOpenFilePath = event.target.dataset.path
      appVars.currentlyOpenFileSha = event.target.dataset.sha

      getFileContent(event.target.dataset.path).then((res) => {
        setContentTextArea(atob(res.content))
      })
    })
    directoryDiv.append(buttonTemplate)
  })
}

async function getFileContent(filepath) {
  var octokitRequestOptions = {
    owner: appVars.gitOwner,
    repo: appVars.gitRepo,
    path: filepath
  }
  const res = await appVars.octokit.request(
    'GET ' + appVars.octokitAPIUrl,
    octokitRequestOptions
  )
  return { sha: res.data.sha, content: res.data.content }
}

function createNewButton() {
  /* adding new content button */
  var newButtonTemplate = directoryBtnNewTemplate.content.cloneNode(true)

  // get the button and set the
  var button = newButtonTemplate.querySelector('button')
  button.dataset.path = contentPathText.value

  var buttonText = newButtonTemplate.querySelector('span')
  buttonText.textContent = 'Write new '
  directoryDiv.append(newButtonTemplate)

  button.addEventListener('click', (event) => {
    notify('hidden', '')
    closeSideNav()
    setContentTextArea('')
    appVars.currentlyOpenFileSha = ''
    appVars.currentlyOpenFilePath = contentPathText.value + '/undefined.md'

    mainTitle.classList.add('hidden')
    newFileNameText.classList.remove('hidden')

    editBtn.classList.add('hidden')
    previewBtn.classList.remove('hidden')
  })
}

/******************************************************************************/
/* PUBLISH */
/******************************************************************************/
document.querySelector('#publish-btn').addEventListener('click', (event) => {
  if (!getGitMessage()) {
    notify('error', 'Git commit message is empty')
    return
  }

  if (!appVars.currentlyOpenFilePath) {
    notify('error', 'There is no file path selected')
    return
  }

  notify('hidden', '')

  var octokitRequestOptions = {
    owner: appVars.gitOwner,
    repo: appVars.gitRepo,
    path: appVars.currentlyOpenFilePath,
    message: getGitMessage(),
    content: btoa(getContentTextArea())
  }

  // Adding SHA in a case of update
  if (appVars.currentlyOpenFileSha) {
    octokitRequestOptions.sha = appVars.currentlyOpenFileSha
  }

  callOctokit('PUT', appVars.octokitAPIUrl, octokitRequestOptions, (res) => {
    appVars.currentlyOpenFileSha = res.data.content.sha
    notify('success', 'Content committed to github, hurray!')
    setGitMessage('')
    console.log(res)
  })
})

/******************************************************************************/
/* DELETE FILE */
/******************************************************************************/
document.querySelector('#delete-btn').addEventListener('click', (event) => {
  notify('hidden', '')

  const gitMessage = getGitMessage()

  if (!gitMessage) {
    notify('error', 'Git commit message is empty')
    return
  }

  if (!appVars.currentlyOpenFilePath) {
    notify('error', 'There is no file path selected')
    return
  }

  if (!appVars.currentlyOpenFileSha) {
    notify('error', 'This file has no SHA, cannot be deleted.')
    return
  }

  var octokitRequestOptions = {
    owner: appVars.gitOwner,
    repo: appVars.gitRepo,
    path: appVars.currentlyOpenFilePath,
    message: gitMessage,
    sha: appVars.currentlyOpenFileSha
  }

  callOctokit('DELETE', appVars.octokitAPIUrl, octokitRequestOptions, (res) => {
    appVars.currentlyOpenFileSha = ''
    notify('success', 'Content has been deleted from repository!')
    setPageTitle('')
    setContentTextArea('')
    setGitMessage('')
  })
})

/******************************************************************************/
/* SIGN IN (LOAD FILES) */
/******************************************************************************/
document.querySelector('#sign-in').addEventListener('click', (event) => {
  appVars.gitOwner = document.querySelector('#git-owner').value
  appVars.gitRepo = document.querySelector('#git-repository').value
  appVars.gitToken = document.querySelector('#git-auth').value

  if (!appVars.gitOwner || !appVars.gitRepo || !appVars.gitToken) {
    notify('error', 'You missed to enter something...')
  } else {
    notify('hidden', '')

    appVars.octokit = new Octokit({
      auth: appVars.gitToken
    })

    setPageTitle('')
    setContentTextArea('')

    document.querySelector('#login-form').classList.add('hidden')
    document.querySelector('#path-loader').classList.remove('hidden')
    document.querySelector('#blog-container').classList.remove('hidden')
    opennav.classList.remove('hidden')
    directoryDiv.classList.remove('hidden')

    loadGitRepository()
  }
})

/******************************************************************************/
/* RELOAD */
/******************************************************************************/
refreshGitDirectoryBtn.addEventListener('click', (event) => {
  loadGitRepository()
})

/******************************************************************************/
/* SHOW SIGN IN */
/******************************************************************************/
loadGitDirectoryBtn.addEventListener('click', (event) => {
  closeSideNav()
  setPageTitle('Sign in')

  document.querySelector('#git-auth').value = appVars.gitToken

  document.querySelector('#login-form').classList.remove('hidden')
  document.querySelector('#path-loader').classList.add('hidden')
  document.querySelector('#blog-container').classList.add('hidden')

  opennav.classList.add('hidden')
  directoryDiv.classList.add('hidden')
})

/******************************************************************************/
/* EDIT FILE */
/******************************************************************************/
editBtn.addEventListener('click', (event) => {
  contentPreview.classList.add('hidden')
  contentTextArea.classList.remove('hidden')
  editBtn.classList.add('hidden')
  previewBtn.classList.remove('hidden')
})

/******************************************************************************/
/* SHOW FILE PREVIEW */
/******************************************************************************/
previewBtn.addEventListener('click', (event) => {
  appVars.octokit
    .request('POST /markdown', {
      text: contentTextArea.value
    })
    .then((res) => {
      editBtn.classList.remove('hidden')
      previewBtn.classList.add('hidden')
      contentPreview.classList.remove('hidden')
      contentTextArea.classList.add('hidden')
      contentPreview.innerHTML = res.data
    })
})

/******************************************************************************/
/* UTILITY */
/******************************************************************************/

/* SHOW NOTIFICATION */
function notify(className, message) {
  notificationText.classList.remove(...notificationText.classList)
  notificationText.classList.add(className)
  notificationText.textContent = message
}

/* CALL OCTOKIT API */
function callOctokit(method = 'GET', octokitAPIUrl, requestOptions, callback) {
  appVars.octokit
    .request(method + ' ' + octokitAPIUrl, requestOptions)
    .then((res) => {
      callback(res)
    })
    .catch((error) => {
      notify('error', 'Error during API call.')
      console.log(error)
    })
}

function setPageTitle(title) {
  mainTitle.textContent = title
}

function setGitDirectory(dir) {
  gitDirectoryPath.textContent = dir
}

function getContentTextArea() {
  return contentTextArea.value
}

function setContentTextArea(content) {
  contentTextArea.value = content
}

function getGitMessage() {
  return gitMessageTextfield.value
}

function setGitMessage(msg) {
  gitMessageTextfield.value = msg
}

//
function closeSideNav() {
  const isOpen = document.location.hash === '#sidenav-open'
  isOpen ? window.history.back() : (document.location.hash = '')
}
