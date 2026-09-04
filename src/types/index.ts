export interface User {
  id: string
  name: string
  username: string
  email: string
  avatar: string
  bio: string
  xp: number
  followers: string[]
  following: string[]
  isPremium: boolean
  premiumPlan?: 'month' | 'half' | 'year' | 'lifetime'
  premiumUntil?: number | null
  hereUntil: number | null
  hereLeftAt?: number | null
  hereDemo?: boolean
  theme: ProfileTheme
  gender: Gender
  age?: number
  showInMeet?: boolean
  meetPhotos?: string[]
  meetPhotosReady?: boolean
  createdAt: number
  role?: 'admin' | 'user'
  banned?: boolean
  banReason?: string
  suspended?: boolean
  suspendedUntil?: number | null
  suspendReason?: string
}

export interface UserReport {
  id: string
  fromId: string
  targetId: string
  reason: string
  createdAt: number
}

export type Gender = 'female' | 'male' | 'unspecified'

export type ProfileTheme = 'default' | 'violet' | 'mint' | 'gold'

export interface Comment {
  id: string
  userId: string
  text: string
  createdAt: number
  hidden?: boolean
}

export interface Post {
  id: string
  userId: string
  image: string
  caption: string
  likes: string[]
  comments: Comment[]
  saves: string[]
  createdAt: number
  sponsored?: boolean
  location?: string
  altText?: string
  hideLikes?: boolean
  commentsOff?: boolean
  taggedIds?: string[]
  audience?: 'everyone' | 'followers'
  archived?: boolean
  pinnedAt?: number | null
  boostedUntil?: number | null
}

export interface Story {
  id: string
  userId: string
  image: string
  createdAt: number
  expiresAt: number
  viewedBy: string[]
  likes: string[]
  mentionedIds?: string[]
}

export interface Reel {
  id: string
  userId: string
  videoUrl: string
  poster?: string
  caption: string
  music: string
  likes: string[]
  comments: Comment[]
  saves: string[]
  createdAt: number
  boostedUntil?: number | null
}

export interface Confession {
  id: string
  content: string
  likes: string[]
  comments: Comment[]
  reports: string[]
  createdAt: number
}

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'view'
  | 'leaderboard'
  | 'challenge'
  | 'xp'
  | 'repost'
  | 'mention'
  | 'match'
  | 'meetup'
  | 'meet_like'
  | 'message'

export interface Repost {
  id: string
  userId: string
  kind: 'post' | 'reel'
  targetId: string
  createdAt: number
}

export interface AppNotification {
  id: string
  type: NotificationType
  actorId?: string
  text: string
  read: boolean
  createdAt: number
  href?: string
  image?: string
  recipientId?: string
}

export type ChatShareKind = 'post' | 'story' | 'reel' | 'story_reply' | 'profile'

export interface ChatShare {
  kind: ChatShareKind
  username?: string
  caption?: string
}

export interface ChatReaction {
  userId: string
  emoji: string
}

export interface ChatReplyTo {
  id: string
  senderId: string
  text: string
}

export interface ChatMessage {
  id: string
  senderId: string
  text: string
  image?: string
  video?: string
  createdAt: number
  share?: ChatShare
  reactions?: ChatReaction[]
  replyTo?: ChatReplyTo
  system?: boolean
}

export interface Conversation {
  id: string
  participantIds: string[]
  messages: ChatMessage[]
  updatedAt: number
  pendingRequestFor?: string
  lastRead?: Record<string, number>
}

export type ChallengeType = 'daily' | 'weekly'

export interface ChallengeDef {
  id: string
  type: ChallengeType
  title: string
  description: string
  xp: number
  target: number
  metric: ChallengeMetric
}

export type ChallengeMetric =
  | 'story'
  | 'like'
  | 'comment'
  | 'here'
  | 'confession_comment'
  | 'login_days'
  | 'weekly_story'
  | 'interact_users'

export interface ChallengeState {
  id: string
  periodKey: string
  progress: number
  claimed: boolean
}

export interface XpEvent {
  id: string
  amount: number
  reason: string
  createdAt: number
}

export interface BadgeDef {
  id: string
  title: string
  description: string
  emoji: string
}

export interface ProfileView {
  id: string
  viewerId: string
  targetId: string
  createdAt: number
}

export interface HereSession {
  id: string
  userId: string
  startedAt: number
  endedAt: number | null
}

export interface Session {
  userId: string
  username: string
}

export interface SavedAccount {
  userId: string
  username: string
  name: string
  avatar: string
  token: string
  lastUsedAt: number
}

export interface Credentials {
  username: string
  email: string
  password: string
}

export type MessagePrivacy = 'everyone' | 'following' | 'none'
export type AudiencePrivacy = 'everyone' | 'following' | 'none'
export type MeetShowGender = 'female' | 'male' | 'everyone'
export type MeetLikeStatus = 'pending' | 'accepted' | 'rejected'

export interface UserSettings {
  userId: string
  privateAccount: boolean
  hideHereStatus: boolean
  hideLikes: boolean
  ghostMode: boolean
  allowMessages: MessagePrivacy
  allowComments: AudiencePrivacy
  allowMentions: AudiencePrivacy
  allowTags: AudiencePrivacy
  allowStoryReplies: boolean
  hiddenWords: string[]
  loginAlerts: boolean
  notifyPaused: boolean
  notifyLikes: boolean
  notifyComments: boolean
  notifyFollows: boolean
  notifyMessages: boolean
  notifyStory: boolean
  showInMeet: boolean
  meetShowGender: MeetShowGender
  meetAgeMin: number
  meetAgeMax: number
  unmatchRemovesFollow: boolean
  blockedIds: string[]
  mutedIds: string[]
}

export interface MeetLike {
  id: string
  fromUserId: string
  toUserId: string
  status: MeetLikeStatus
  createdAt: number
}

export interface Swipe {
  id: string
  fromId: string
  toId: string
  liked: boolean
  createdAt: number
}

export interface Match {
  id: string
  userIds: [string, string]
  createdAt: number
  conversationId?: string
}

export interface UserReport {
  id: string
  fromId: string
  targetId: string
  reason: string
  createdAt: number
  status?: 'open' | 'reviewed'
}

export type MeetupPreference = 'female' | 'male' | 'any'
export type MeetupStatus = 'open' | 'full' | 'cancelled' | 'completed'
export type MeetupRequestStatus = 'pending' | 'accepted' | 'rejected'

export interface Meetup {
  id: string
  creatorId: string
  title: string
  description: string
  locationName: string
  date: string
  time: string
  currentParticipants: number
  targetParticipants: number
  participantPreference: MeetupPreference
  participants: string[]
  status: MeetupStatus
  createdAt: string
}

export interface MeetupRequest {
  id: string
  meetupId: string
  userId: string
  status: MeetupRequestStatus
  createdAt: string
  updatedAt?: string
}
