/// <reference types="chrome" />

console.log('Background script running')

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed')
})

export {} // This empty export is necessary to make TypeScript treat this file as a module
