export const MEDIA_DELETE_FLAG = "__DELETE";

export const isMediaMarkedForDeletion = (value: any): boolean =>
	typeof value === "object" && value !== null && value[MEDIA_DELETE_FLAG] === true;

export const markMediaForDeletion = (value?: Record<string, any> | null) => ({
	...(value && typeof value === "object" ? value : {}),
	[MEDIA_DELETE_FLAG]: true,
});
