// Mock fs-extra for Vitest tests
import * as fs from 'node:fs'
import * as path from 'path'

const mockFiles = new Map()

export function setupMockFiles(files) {
	for (const [filePath, content] of Object.entries(files)) {
		mockFiles.set(filePath, content)
	}
}

export function clearMockFiles() {
	mockFiles.clear()
}

// Mock implementations
export const readFile = vi.fn().mockImplementation((filePath, encoding) => {
	const normalizedPath = path.normalize(filePath)
	const content = mockFiles.get(normalizedPath)
	
	if (content !== undefined) {
		return Promise.resolve(content)
	}
	
	// Fallback to real file system for test files
	if (filePath.includes('test-data')) {
		return fs.promises.readFile(filePath, encoding)
	}
	
	return Promise.reject(new Error(`File not found: ${filePath}`))
})

export const writeFile = vi.fn().mockImplementation((filePath, content) => {
	mockFiles.set(path.normalize(filePath), content)
	return Promise.resolve()
})

export const readdir = vi.fn().mockImplementation((dirPath, options) => {
	// Return mock directory contents for test-data
	if (dirPath.includes('test-data')) {
		return Promise.resolve([
			{ name: 'functionA.ts', isDirectory: () => false, isFile: () => true },
			{ name: 'functionB.ts', isDirectory: () => false, isFile: () => true },
			{ name: 'functionC.ts', isDirectory: () => false, isFile: () => true }
		])
	}
	
	return fs.promises.readdir(dirPath, options)
})

export const stat = vi.fn().mockImplementation((filePath) => {
	if (filePath.includes('test-data')) {
		return Promise.resolve({
			isFile: () => true,
			isDirectory: () => false,
			size: 100,
			mtime: new Date()
		})
	}
	
	return fs.promises.stat(filePath)
})

export const mkdir = vi.fn().mockImplementation((dirPath, options) => {
	return Promise.resolve()
})

export const access = vi.fn().mockImplementation((filePath, mode) => {
	if (filePath.includes('test-data')) {
		return Promise.resolve(true)
	}
	return fs.promises.access(filePath, mode)
})

export default {
	readFile,
	writeFile,
	readdir,
	stat,
	mkdir,
	access,
	setupMockFiles,
	clearMockFiles
}