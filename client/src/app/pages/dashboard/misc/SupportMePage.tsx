import useSetSubheader from "components/layout/header/useSetSubheader";
import ExternalLink from "components/util/ExternalLink";
import { TachiConfig } from "lib/config";
import React from "react";
import { Link } from "react-router-dom";

export default function SupportMePage() {
	useSetSubheader("Support / Ko-fi");

	return (
		<div style={{ fontSize: "1.15rem" }}>
			<p>
				{TachiConfig.NAME} is a passion project, based off of{" "}
				<ExternalLink href="https://github.com/zkldi/Tachi">Tachi</ExternalLink> by zk, without
				him and contributors, this project wouldn't have been lifted off the ground.
			</p>
			<p>
				If you want to support {TachiConfig.NAME} upkeep, you can donate to my{" "}
				<ExternalLink href="https://ko-fi.com/coulrulner1">Ko-fi</ExternalLink>, and if you
				want to support Tachi as well, you can find zk's{" "}
				<ExternalLink href="https://ko-fi.com/zkldichi">Ko-fi</ExternalLink> here.
			</p>
			<p>
				Alternatively, you can star the{" "}
				<ExternalLink href="https://github.com/zkldi/Tachi">GitHub Repo</ExternalLink>. This
				makes zk look cool to employers!
			</p>
		</div>
	);
}
