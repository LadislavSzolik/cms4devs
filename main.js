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
  return document.getElementById('git-message').value
}

function setGitMessage(msg) {
  document.getElementById('git-message').value = msg
}

// Get screen elements
const mainTitle = document.getElementById('main-title')
const notificationText = document.getElementById('notification')

const gitDirectoryPath = document.querySelector('#git-directory-path')
const contentPathText = document.getElementById('content-path')
const directoryDiv = document.getElementById('directory')
const newFileNameText = document.getElementById('newfilename')
const contentTextArea = document.getElementById('blog-area')
const contentPreview = document.getElementById('blog-preview')

// HTML Templates
const directoryBtnTemplate = document.getElementById('directory-btn')
const directoryBtnNewTemplate = document.getElementById('directory-btn-new')

const editBtn = document.getElementById('edit-btn')
const previewBtn = document.getElementById('preview-btn')

var currentlyOpenFilePath = null
var currentlyOpenFileSha = null
var gitToken = null
var gitOwner = null
var gitRepo = null
var octokit = null

// Capture the new file name.
newFileNameText.addEventListener('change', (event) => {
  currentlyOpenFilePath = contentPathText.value + '/' + event.target.value
})

function closeSideNav() {
  const isOpen = document.location.hash === '#sidenav-open'
  isOpen ? window.history.back() : (document.location.hash = '')
}

// Loading from Git repository
function loadGitRepository() {
  directory.innerHTML = 'Loading...'

  var octokitRequestOptions = {
    owner: gitOwner,
    repo: gitRepo,
    path: contentPathText.value
  }

  octokit
    .request('GET /repos/{owner}/{repo}/contents/{path}', octokitRequestOptions)
    .then((response) => {
      // clear directory list
      directory.innerHTML = ''

      setGitDirectory(contentPathText.value)

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
        currentlyOpenFileSha = ''
        currentlyOpenFilePath = ''

        mainTitle.classList.add('hidden')
        newFileNameText.classList.remove('hidden')

        editBtn.classList.add('hidden')
        previewBtn.classList.remove('hidden')
      })

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
          currentlyOpenFilePath = event.target.dataset.path
          currentlyOpenFileSha = event.target.dataset.sha

          getContent(event.target.dataset.path).then((res) => {
            setContentTextArea(atob(res.content))
          })
        })
        directoryDiv.append(buttonTemplate)
      })
    })
}

/* publish to github */
document.getElementById('publish-btn').addEventListener('click', (event) => {
  notify('hidden', '')

  const gitMessage = getGitMessage()

  if (!gitMessage) {
    notify('error', 'Git commit message is empty')
    return
  }

  if (!currentlyOpenFilePath) {
    notify('error', 'There is no file path selected')
    return
  }

  const encodedBlog = btoa(getContentTextArea())

  var octokitRequestOptions = {
    owner: gitOwner,
    repo: gitRepo,
    path: currentlyOpenFilePath,
    message: gitMessage,
    content: encodedBlog
  }

  // Adding SHA in a case of update
  if (currentlyOpenFileSha) {
    octokitRequestOptions.sha = currentlyOpenFileSha
  }

  octokit
    .request('PUT /repos/{owner}/{repo}/contents/{path}', octokitRequestOptions)
    .then((res) => {
      currentlyOpenFileSha = res.data.content.sha
      notify('success', 'Content committed to github, hurray!')
      setGitMessage('')
      console.log(res)
    })
    .catch((error) => {
      notify('error', 'Error during API call.')
      console.log(error)
    })
})

document.getElementById('delete-btn').addEventListener('click', (event) => {
  notify('hidden', '')

  const gitMessage = getGitMessage()

  if (!gitMessage) {
    notify('error', 'Git commit message is empty')
    return
  }

  if (!currentlyOpenFilePath) {
    notify('error', 'There is no file path selected')
    return
  }

  if (!currentlyOpenFileSha) {
    notify('error', 'This file has no SHA, cannot be deleted.')
    return
  }

  var octokitRequestOptions = {
    owner: gitOwner,
    repo: gitRepo,
    path: currentlyOpenFilePath,
    message: gitMessage,
    sha: currentlyOpenFileSha
  }

  octokit
    .request(
      'DELETE /repos/{owner}/{repo}/contents/{path}',
      octokitRequestOptions
    )
    .then((res) => {
      currentlyOpenFileSha = ''
      notify('success', 'Content has been deleted from repository!')
      setPageTitle('')
      setContentTextArea('')
      setGitMessage('')
    })
    .catch((error) => {
      notify('error', 'Error during API call.')
      console.log(error)
    })
})

async function getContent(filepath) {
  var octokitRequestOptions = {
    owner: gitOwner,
    repo: gitRepo,
    path: filepath
  }
  const res = await octokit.request(
    'GET /repos/{owner}/{repo}/contents/{path}',
    octokitRequestOptions
  )
  return { sha: res.data.sha, content: res.data.content }
}

// SIGN in
document.getElementById('sign-in').addEventListener('click', (event) => {
  gitOwner = document.getElementById('git-owner').value
  gitRepo = document.getElementById('git-repository').value
  gitToken = document.getElementById('git-auth').value

  if (!gitOwner || !gitRepo || !gitToken) {
    notify('error', 'You missed to enter something...')
  } else {
    notify('hidden', '')

    octokit = new Octokit({
      auth: gitToken
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

document
  .getElementById('load-gitdir-btn')
  .addEventListener('click', (event) => {
    closeSideNav()
    setPageTitle('Sign in')

    document.getElementById('git-auth').value = gitToken
    document.querySelector('#login-form').classList.remove('hidden')
    document.querySelector('#path-loader').classList.add('hidden')
    document.querySelector('#blog-container').classList.add('hidden')
    opennav.classList.add('hidden')
    directoryDiv.classList.add('hidden')
  })

/* utility functions */
function notify(className, message) {
  notificationText.classList.remove(...notificationText.classList)
  notificationText.classList.add(className)
  notificationText.textContent = message
}

editBtn.addEventListener('click', (event) => {
  contentPreview.classList.add('hidden')
  contentTextArea.classList.remove('hidden')
  editBtn.classList.add('hidden')
  previewBtn.classList.remove('hidden')
})

previewBtn.addEventListener('click', (event) => {
  octokit
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
