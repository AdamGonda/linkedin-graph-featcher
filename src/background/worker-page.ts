import { EXTENSION_VERSION } from '../shared/constants'

const manifest = chrome.runtime.getManifest()

const set = (id: string, value: string) => {
  const el = document.getElementById(id)
  if (el) el.textContent = value
}

set('manifest-version', manifest.version)
set('ext-version', EXTENSION_VERSION)
set('build-time', typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 'dev')
set('ext-id', chrome.runtime.id)
