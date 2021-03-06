function dateToTime(inDate){
	const time = `${inDate.getFullYear()}-${inDate.getMonth()}-${(inDate.getDate() < 10) ? `0${inDate.getDate()}` : inDate.getDate()} ${inDate.getHours()}:${(inDate.getMinutes() < 10) ? `0${inDate.getMinutes()}` : inDate.getMinutes()}:${(inDate.getSeconds() < 10) ? `0${inDate.getSeconds()}` : inDate.getSeconds()}`;
	return time;
}

function performanceLogger(status, first){
	console.log(status, (Date.now() - first) / 1000, "s");
}

function replyNoMention(message, content){
	return new Promise((resolve, reject) => {
		message.reply({ content: content, allowedMentions: { repliedUser: false } }).then((msg) => {
			resolve(msg);
		}).catch((err) => {
			reject(err);
		});
	});
}

function errorMessage(time, dm, string){
	console.error(`[${dateToTime(time)}]: ${(dm) ? "DM: " : ""}${string}`);
	return;
}

module.exports = { dateToTime, performanceLogger, replyNoMention, errorMessage, groupList: ["raid", "badge", "pvpiv", "profile"], dev: "146186496448135168" };
