export default function (message: string): boolean {
	return (
		message.includes('received 0') || // UDP timeout ignore
		message.includes('Timed out') ||
		message.includes('getaddrinfo EAI_AGAIN minecraft') ||
		message.includes('Server is offline or unreachable')
	);
}
