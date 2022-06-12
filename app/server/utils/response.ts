import { ErrorResponse, PartialResponse, SuccessResponse } from '$types';
import { logs } from '$utils/logs';
import { getFunctionAndLine } from '$utils/utils';

export function sql(response: SuccessResponse | PartialResponse | ErrorResponse, errMessage: string | null = null): string | Array<any>
{
	if (response.state === "success") {
		return response.content || [];
	}

	const debug: string = getFunctionAndLine();
	const message = response.message || "";

	if (response.state === "partial") {
		logs.warning(`${debug} ${message}`);
		return "empty";
	}

	logs.error(`${debug} ${errMessage ? errMessage : "failed"} ${message !== "" ? "\n" + message : ""}`, false);
	return "error";
}

export function ft(response: SuccessResponse | PartialResponse | ErrorResponse, errMessage: string | null = null): string
{
	if (response.state === "success") {
		return "success";
	}

	const debug: string = getFunctionAndLine();
	const message = response.message || "";

	if (response.state === "partial") {
		logs.warning(`${debug} ${message}`);
		return "empty";
	}

	logs.error(`${debug} ${errMessage ? errMessage : "failed"} ${message !== "" ? "\n" + message : ""}`, false);
	return "error";
}
