declare module '@hackolade/hck-esbuild-plugins-pack' {
	import type { Plugin } from 'esbuild';

	export interface CopyFolderFilesOptions {
		fromPath: string;
		targetFolderPath: string;
		excludedExtensions?: string[];
		excludedFiles?: string[];
	}

	export function copyFolderFiles(options: CopyFolderFilesOptions): Plugin;
	export function addReleaseFlag(packageJsonPath: string): Plugin;
}
