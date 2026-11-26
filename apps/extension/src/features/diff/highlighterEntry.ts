import * as highlighter from './highlighter'
import { HIGHLIGHTER_GLOBAL } from './highlight'

Object.assign(globalThis, { [HIGHLIGHTER_GLOBAL]: highlighter })
