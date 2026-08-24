import {z} from "zod";

import {ApiTransport} from "../transport";
import {MalformedConfigResponseError} from "./schema";

const FOLDER_LISTING_PATH = "internalapi/config/folderlisting";

/**
 * `FileSystemBrowser.DirectoryListingRequest`. `type` is the literal string
 * legacy sends (`file-selection-service.js`): `"folder"` makes the backend omit
 * the file list entirely (`FileSystemEntry`'s constructor), anything else
 * includes it.
 */
export type FolderListingMode = "file" | "folder";

const fileSystemSubEntrySchema = z.looseObject({
    fullPath: z.string(),
    name: z.string(),
});

/**
 * `FileSystemBrowser.FileSystemEntry`. `fullPath` is absent from the roots
 * listing the backend returns when going up from a filesystem root
 * (`FileSystemEntry.getRoots` never sets it), so it is nullish here.
 */
const fileSystemEntrySchema = z.looseObject({
    files: z.array(fileSystemSubEntrySchema).nullish(),
    folders: z.array(fileSystemSubEntrySchema).nullish(),
    fullPath: z.string().nullish(),
    hasParent: z.boolean().nullish(),
});

type FileSystemSubEntry = {
    fullPath: string;
    name: string;
};

export type FileSystemEntry = {
    files: FileSystemSubEntry[];
    folders: FileSystemSubEntry[];
    fullPath: string;
    hasParent: boolean;
};

/**
 * `API-CONFIG-FOLDER-LISTING`: the server-side directory listing behind every
 * file/folder picker in the configuration area. The browsing happens on the
 * server because the paths being configured are the *server's* paths, which a
 * browser file input cannot see at all.
 */
export async function getFolderListing(
    transport: ApiTransport,
    request: {fullPath: string | null; goUp: boolean; type: FolderListingMode},
): Promise<FileSystemEntry> {
    const parsed = fileSystemEntrySchema.safeParse(
        await transport.request<unknown>(FOLDER_LISTING_PATH, {
            json: request,
            method: "POST",
        }),
    );
    if (!parsed.success) {
        throw new MalformedConfigResponseError("folder listing");
    }
    return {
        files: parsed.data.files ?? [],
        folders: parsed.data.folders ?? [],
        fullPath: parsed.data.fullPath ?? "",
        hasParent: parsed.data.hasParent === true,
    };
}
