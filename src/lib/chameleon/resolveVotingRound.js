import prisma from "@/lib/prisma";

export async function resolveVotingRound(sessionId) {
  const session = await prisma.chameleonSession.findUnique({
    where: { id: sessionId },
    include: { players: true, votes: true },
  });

  if (!session || session.status !== "voting") {
    return { resolved: false, session };
  }

  const activePlayers = session.players.filter((player) => player.isParticipating);

  if (activePlayers.length === 0 || session.votes.length < activePlayers.length) {
    return { resolved: false, session };
  }

  const voteCounts = {};
  session.votes.forEach((vote) => {
    voteCounts[vote.votedTargetId] = (voteCounts[vote.votedTargetId] || 0) + 1;
  });

  const chameleonVotes = voteCounts[session.chameleonId] || 0;
  const votesNeeded = Math.floor(activePlayers.length / 2) + 1;

  if (chameleonVotes >= votesNeeded) {
    const humanIds = activePlayers
      .filter((player) => player.id !== session.chameleonId)
      .map((player) => player.id);

    if (humanIds.length > 0) {
      await prisma.chameleonPlayer.updateMany({
        where: { id: { in: humanIds } },
        data: { score: { increment: 1 } },
      });
    }
  } else {
    await prisma.chameleonPlayer.update({
      where: { id: session.chameleonId },
      data: { score: { increment: 2 } },
    });
  }

  await prisma.chameleonSession.update({
    where: { id: session.id },
    data: {
      status: "results",
      votesUsed: { increment: 1 },
    },
  });

  return { resolved: true, session };
}
