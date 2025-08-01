import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useQuery, useMutation, useConvex } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Id, Doc } from '../convex/_generated/dataModel';
import { Toaster, toast } from 'sonner';
import { ReportUserModal } from './ReportUserModal';
import StatHexagon from "./components/StatHexagon";

const Button = ({ onClick, children, className = '', disabled = false, variant = 'primary', type, size }: {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'md';
}) => {
  const baseStyle = 'px-4 py-2 rounded font-semibold shadow-sm hover:shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background';
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2' };
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    ghost: 'bg-transparent text-primary hover:bg-primary/10',
    accent: 'bg-accent text-accent-foreground hover:bg-accent/90',
  };
  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${sizes[size ?? 'md']} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};
const Modal = ({ isOpen, onClose, title, children, size = "md", contentClassName = "" }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  contentClassName?: string;
}) => {
  if (!isOpen) return null;
  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className={`bg-card shadow-xl w-full ${sizeClasses[size]} rounded-lg flex flex-col max-h-[90vh]`}>
        <div className="flex justify-between items-center p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="text-xl font-semibold text-primary">{title}</h3>
          <Button onClick={onClose} variant="ghost" className="text-muted-foreground hover:text-card-foreground p-1 text-2xl">×</Button>
        </div>
        <div className={`p-4 overflow-y-auto ${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
};

const TextareaField = ({ label, value, onChange, placeholder, required = false, className = "", rows = 3 }: {
  label?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  rows?: number;
}) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>}
    <textarea value={value} onChange={onChange} placeholder={placeholder} required={required} rows={rows}
      className="w-full px-3 py-2 rounded border bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm hover:shadow-md text-card-foreground placeholder-muted-foreground" />
  </div>
);

const InputField = ({ label, type = "text", value, onChange, placeholder, required = false, className = "" }: {
  label?: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) => (
  <div className={`mb-4 ${className}`}>
    {label && <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>}
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
      className="w-full px-3 py-2 rounded border bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm hover:shadow-md text-card-foreground placeholder-muted-foreground" />
  </div>
);

function getErrorMessage(error: any): string {
  if (typeof error === "string") return error;
  if (error?.data?.message) return error.data.message;
  if (error?.data?.details) return error.data.details;
  if (error?.message) return error.message;
  return "An unknown error occurred.";
}

type FriendRequestWithDetails = Doc<"friendRequests"> & {
  requesterName?: string;
  requesterProfileImageUrl?: string | null;
  _id: Id<"friendRequests">;
};

type FriendWithDetails = Partial<Doc<"userProfiles"> & Doc<"users">> & {
  _id: Id<"users">;
  friendRequestId?: Id<"friendRequests">;
  displayName?: string | null;
  profileImageUrl?: string | null;
};

type BlockedUserWithDetails = Partial<Doc<"userProfiles"> & Doc<"users">> & {
  _id: Id<"users">;
  blockRecordId: Id<"blockedUsers">;
  displayName?: string | null;
  profileImageUrl?: string | null;
  reason?: string | null;
};
export function UserProfileModal({
  isOpen,
  onClose,
  userId,
  viewingOwnProfile,
  onNavigateToProfile,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: Id<"users"> | null;
  viewingOwnProfile: boolean;
  onNavigateToProfile: (userId: Id<"users">) => void;
}) {
  const userProfileToView = useQuery(
    api.userProfiles.getUserPublicProfile,
    userId ? { userId } : "skip"
  );
  const loggedInUser = useQuery(api.auth.loggedInUser);
  
  // If the auth session is still loading, show loading UI
  if (loggedInUser === undefined) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Your Profile">
        Loading your session…
      </Modal>
    );
  }
  
  // If no user is signed in, prompt to sign in
  if (loggedInUser === null) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Your Profile">
        Please sign in to view this profile.
      </Modal>
    );
  }  
  const friendshipStatus = useQuery(api.friends.getFriendshipStatus, userId && loggedInUser && userId !== loggedInUser._id ? { otherUserId: userId } : "skip");
  const sendFriendRequestMutation = useMutation(api.friends.sendFriendRequest);
  const acceptFriendRequestMutation = useMutation(api.friends.acceptFriendRequest);
  const declineFriendRequestMutation = useMutation(api.friends.declineFriendRequest);
  const removeFriendMutation = useMutation(api.friends.removeFriend);

  const blockStatus = useQuery(api.blocks.getBlockStatus, userId && loggedInUser && userId !== loggedInUser._id ? { otherUserId: userId } : "skip");
  const blockUserMutation = useMutation(api.blocks.blockUser);
  const unblockUserMutation = useMutation(api.blocks.unblockUser);

  const myFriends = useQuery(api.friends.listFriends, viewingOwnProfile ? {} : "skip");
  const myPendingRequests = useQuery(api.friends.listPendingFriendRequests, viewingOwnProfile ? {} : "skip");
  const myBlockedUsers = useQuery(api.blocks.listMyBlockedUsers, viewingOwnProfile ? {} : "skip") as BlockedUserWithDetails[] | undefined;

  const generateUploadUrl = useMutation(api.userProfiles.generateProfilePictureUploadUrl);
  const saveProfilePicture = useMutation(api.userProfiles.saveProfilePicture);
  const updateUserProfileMutation = useMutation(api.userProfiles.updateUserProfile);

  const myCreatedMatches = useQuery(api.matches.getMyCreatedMatches, loggedInUser && !viewingOwnProfile ? {} : "skip");
  const myJoinedMatches = useQuery(api.matches.getMyJoinedMatches, loggedInUser && !viewingOwnProfile ? {} : "skip");
  const sendPartyInvitationMutation = useMutation(api.partyInvitations.sendPartyInvitation);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [bio, setBio] = useState("");
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [country, setCountry] = useState("");
  const [favoritePosition, setFavoritePosition] = useState<string>("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (userProfileToView) {
      setBio(userProfileToView.bio ?? '');
      setDisplayName(userProfileToView.displayName ?? 'Anonymous Egoist');
      setCountry(userProfileToView.country ?? '');
      setFavoritePosition(userProfileToView.favoritePosition ?? '');
    }
    if (!viewingOwnProfile) {
      setIsEditingBio(false);
      setIsEditingDisplayName(false);
    }
  }, [userProfileToView, viewingOwnProfile]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!viewingOwnProfile) return;
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      await handleImageUpload(file);
    }
  };

  const handleImageUpload = async (fileToUpload: File) => {
    if (!viewingOwnProfile || !fileToUpload) return;
    setIsUploading(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': fileToUpload.type },
        body: fileToUpload,
      });
      const { storageId } = await result.json();
      if (!result.ok) throw new Error(`Upload failed: ${JSON.stringify(storageId)}`);
      await saveProfilePicture({ storageId });
      toast.success('Profile picture updated!');
      setSelectedFile(null);
    } catch (error) {
      toast.error(`Failed to upload image: ${getErrorMessage(error)}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleProfileTextualInfoSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!viewingOwnProfile) return;
    try {
      const favPos = favoritePosition.trim() === '' ? undefined : (favoritePosition as 'goalkeeper' | 'defender' | 'midfielder' | 'forward');
      await updateUserProfileMutation({
        bio,
        country: country.trim() === '' ? undefined : country.trim(),
        favoritePosition: favPos,
      });
      toast.success('Profile details updated!');
      setIsEditingBio(false);
    } catch (error) {
      toast.error(`Failed to update profile details: ${getErrorMessage(error)}`);
    }
  };

  const handleDisplayNameSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!viewingOwnProfile) return;
    try {
      await updateUserProfileMutation({ displayName });
      toast.success('Egoist Name updated!');
      setIsEditingDisplayName(false);
    } catch (error) {
      toast.error(`Failed to update Egoist Name: ${getErrorMessage(error)}`);
    }
  };

  const handleSendRequest = async () => {
    if (!userId || viewingOwnProfile) return;
    try {
      await sendFriendRequestMutation({ requesteeId: userId });
      toast.success('Friend request sent!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleAcceptRequest = async (requestId: Id<'friendRequests'>) => {
    try {
      await acceptFriendRequestMutation({ requestId });
      toast.success('Friend request accepted!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeclineRequest = async (requestId: Id<'friendRequests'>) => {
    try {
      await declineFriendRequestMutation({ requestId });
      toast.info('Friend request declined.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleRemoveFriend = async (friendshipId: Id<'friendRequests'>) => {
    if (!friendshipId) return;
    if (window.confirm(`Are you sure you want to remove this friend?`)) {
      try {
        await removeFriendMutation({ friendshipId });
        toast.info('Friend removed.');
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    }
  };

  const handleCancelSentRequest = async () => {
    if (!friendshipStatus?._id) return;
    if (window.confirm('Are you sure you want to cancel this friend request?')) {
      try {
        await declineFriendRequestMutation({ requestId: friendshipStatus._id });
        toast.info('Friend request cancelled.');
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    }
  };

  const handleBlockUser = async () => {
    if (!userId || viewingOwnProfile) return;
    if (window.confirm(`Are you sure you want to block ${userProfileToView?.displayName || 'this user'}? You will no longer be friends and cannot interact.`)) {
      try {
        await blockUserMutation({ blockedId: userId });
        toast.success('User blocked.');
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    }
  };

  const handleUnblockUser = async (userToUnblockId: Id<'users'>) => {
    if (!userToUnblockId) return;
    try {
      await unblockUserMutation({ blockedId: userToUnblockId });
      toast.success('User unblocked.');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleInviteToParty = async (matchId: Id<'matches'>, message?: string) => {
    if (!userId) return;
    try {
      await sendPartyInvitationMutation({
        matchId,
        inviteeId: userId,
        message: message?.trim() || undefined,
      });
      toast.success('Party invitation sent!');
      setShowInviteModal(false);
    } catch (error) {
      toast.error(`Failed to send invitation: ${getErrorMessage(error)}`);
    }
  };
  if (!userId) return null;
  const profileData = userProfileToView;
  const isBlockedByThisUser = blockStatus?.status === 'blocked_you';
  const isBlockedByMe = blockStatus?.status === 'blocked_by_you';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={viewingOwnProfile ? 'My Egoist Profile' : `${profileData?.displayName ?? 'Egoist'}'s Profile`}
        size="xl"
        contentClassName="flex-grow"
      >
        {!profileData && <p className="text-muted-foreground">Loading profile...</p>}
        {profileData === null && <p className="text-destructive">Could not load profile.</p>}
        {profileData && (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <div className="relative">
                <img
                  src={profileData.profileImageUrl ?? '/blue-lock-logo-placeholder.png'}
                  alt={profileData.displayName ?? 'User'}
                  className="w-28 h-28 rounded-full object-cover border-2 border-primary shadow-lg"
                />
                {viewingOwnProfile && (
                  <>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="ghost"
                      className="absolute bottom-0 right-0 bg-card/80 rounded-full p-1.5 shadow-md text-lg text-accent"
                      disabled={isUploading}
                    >
                      ✏️
                    </Button>
                    {isUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-foreground"></div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="text-center sm:text-left flex-grow">
                {/* Display Name Editing */}
                {viewingOwnProfile && isEditingDisplayName ? (
                  <form onSubmit={handleDisplayNameSave} className="flex items-center gap-2">
                    <InputField
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your Egoist Name"
                      className="mb-0 flex-grow"
                    />
                    <Button type="submit" size="sm" className="h-10">
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="h-10"
                      onClick={() => {
                        setIsEditingDisplayName(false);
                        setDisplayName(profileData.displayName ?? 'Anonymous Egoist');
                      }}
                    >
                      X
                    </Button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h4 className="text-3xl font-bold text-primary">
                      {profileData.displayName ?? 'Anonymous Egoist'}
                    </h4>
                    {viewingOwnProfile && (
                      <Button variant="ghost" onClick={() => setIsEditingDisplayName(true)} className="text-sm p-1 text-accent">
                        ✏️
                      </Button>
                    )}
                  </div>
                )}

                {/* User ID */}
                {profileData.uniqueUserId && (
                  <p className="text-xs text-muted-foreground/70 mt-1 font-light">
                    ID: <span className="font-mono text-muted-foreground">{profileData.uniqueUserId}</span>
                  </p>
                )}

                {/* Action Buttons */}
                {loggedInUser && !viewingOwnProfile && userId && !isBlockedByThisUser && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {/* Friendship Buttons */}
                    {friendshipStatus === undefined && <Button disabled size="sm">Loading Status...</Button>}

                    {friendshipStatus === null && !isBlockedByMe && (
                      <Button onClick={handleSendRequest} size="sm" variant="accent">Add Friend</Button>
                    )}

                    {friendshipStatus?.status === 'pending' && !isBlockedByMe && (
                      <>
                        {friendshipStatus.requesterId === loggedInUser._id ? (
                          <Button onClick={handleCancelSentRequest} size="sm" variant="secondary">Cancel Request</Button>
                        ) : (
                          <>
                            <Button onClick={() => handleAcceptRequest(friendshipStatus._id)} size="sm" variant="primary">Accept</Button>
                            <Button onClick={() => handleDeclineRequest(friendshipStatus._id)} size="sm" variant="danger">Decline</Button>
                          </>
                        )}
                      </>
                    )}

                    {friendshipStatus?.status === 'accepted' && !isBlockedByMe && (
                      <>
                        <Button onClick={() => handleRemoveFriend(friendshipStatus._id)} size="sm" variant="secondary">Remove Friend</Button>
                        <Button onClick={() => setShowInviteModal(true)} size="sm" variant="accent">Invite to Party</Button>
                      </>
                    )}

                    {(friendshipStatus?.status === 'declined' || friendshipStatus?.status === 'removed') && !isBlockedByMe && (
                      <Button onClick={handleSendRequest} size="sm" variant="accent">Add Friend</Button>
                    )}

                    {isBlockedByMe ? (
                      <Button onClick={() => handleUnblockUser(userId)} size="sm" variant="accent">Unblock User</Button>
                    ) : (
                      <Button onClick={handleBlockUser} size="sm" variant="danger">Block User</Button>
                    )}

                    <Button onClick={() => setShowReportModal(true)} size="sm" variant="ghost" className="text-warning">Report User</Button>
                  </div>
                )}

                {isBlockedByThisUser && (
                  <p className="text-sm text-destructive mt-2">You are blocked by this user.</p>
                )}
              </div>
            </div>
                        {/* About & Location */}
                        {isBlockedByThisUser && !viewingOwnProfile ? (
              <p className="text-center text-muted-foreground p-4 bg-input rounded-md">
                Content hidden as you are blocked by this user.
              </p>
            ) : (
              <>
                <div>
                  <h5 className="text-xl font-semibold text-text-cyan-accent mb-2 border-b border-border pb-1">About & Location</h5>
                  {viewingOwnProfile && isEditingBio ? (
                    <form onSubmit={handleProfileTextualInfoSave} className="space-y-3">
                      <TextareaField label="Bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Unleash your ego..." rows={3} />
                      <InputField label="Country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g., Japan, Germany" />
                      <div>
                        <label htmlFor="favoritePosition" className="block text-sm font-medium text-muted-foreground mb-1">Favorite Position</label>
                        <select
                          id="favoritePosition"
                          value={favoritePosition}
                          onChange={(e) => setFavoritePosition(e.target.value)}
                          className="w-full px-3 py-2 rounded border bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm hover:shadow-md text-card-foreground"
                        >
                          <option value="">Not Set / Any</option>
                          <option value="goalkeeper">Goalkeeper</option>
                          <option value="defender">Defender</option>
                          <option value="midfielder">Midfielder</option>
                          <option value="forward">Forward</option>
                        </select>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button type="submit">Save Details</Button>
                        <Button type="button" variant="secondary" onClick={() => {
                          setIsEditingBio(false);
                          setBio(profileData.bio ?? '');
                          setCountry(profileData.country ?? '');
                          setFavoritePosition(profileData.favoritePosition ?? '');
                        }}>Cancel</Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="text-card-foreground whitespace-pre-wrap min-h-[40px] bg-input p-3 rounded-md mb-2">
                        {profileData.bio || <span className="text-muted-foreground italic">{viewingOwnProfile ? 'No bio yet.' : 'Prefers actions over words.'}</span>}
                      </p>
                      <p className="text-card-foreground bg-input p-3 rounded-md mb-2">
                        Country: {profileData.country || <span className="text-muted-foreground italic">{viewingOwnProfile ? 'Not set' : 'Not specified'}</span>}
                      </p>
                      <p className="text-card-foreground bg-input p-3 rounded-md capitalize">
                        Favorite Position: {profileData.favoritePosition || <span className="text-muted-foreground italic">{viewingOwnProfile ? 'Not set' : 'Not specified'}</span>}
                      </p>
                      {viewingOwnProfile && (
                        <Button variant="ghost" onClick={() => setIsEditingBio(true)} className="text-sm mt-1 text-accent">
                          Edit Details
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {/* Player Overview */}
                <div>
                  <h5 className="text-xl font-semibold text-text-green-accent mb-2 border-b border-border pb-1">Player Overview</h5>
                  {profileData.overallScore !== undefined && profileData.ratingsCount !== undefined && profileData.ratingsCount > 0 ? (
                    <p className="text-card-foreground mb-1">
                      Overall Score: <span className="font-bold text-text-yellow-accent text-lg">{profileData.overallScore.toFixed(0)}</span>
                      <span className="text-sm text-muted-foreground"> (from {profileData.ratingsCount} rating submissions)</span>
                    </p>
                  ) : (
                    <p className="text-info">No ratings submitted yet to calculate an overall score.</p>
                  )}
                </div>

                {/* Hexagon Stats */}
                <div className="mt-6">
                  <h5 className="text-xl font-semibold text-text-orange-accent mb-2 border-b border-border pb-1">
                    {viewingOwnProfile ? 'My Football Attributes' : 'Football Attributes'}
                  </h5>
                  <StatHexagon
                    speed={profileData.speed}
                    defense={profileData.defense}
                    offense={profileData.offense}
                    passing={profileData.passing}
                    shooting={profileData.shooting}
                    dribbling={profileData.dribbling}
                  />
                </div>
              </>
            )}

            {/* Friends List */}
            {viewingOwnProfile && (
              <>
                <div className="mt-6">
                  <h5 className="text-xl font-semibold text-text-pink-accent mb-2 border-b border-border pb-1">
                    My Egoist Circle ({myFriends?.length || 0})
                  </h5>
                  {myFriends === undefined ? (
                    <p className="text-muted-foreground">Loading friends...</p>
                  ) : myFriends.length === 0 ? (
                    <p className="text-muted-foreground">No friends yet. Go make some rivals!</p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto bg-input p-3 rounded-md">
                      {myFriends.map(friend => (
                        <li key={friend._id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigateToProfile(friend.userId)}>
                            <img src={friend.profileImageUrl ?? '/blue-lock-logo-placeholder.png'} alt={friend.displayName ?? 'Friend'} className="w-8 h-8 rounded-full object-cover" />
                            <span className="text-card-foreground">{friend.displayName ?? 'Unnamed Egoist'}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Pending Requests */}
                <div className="mt-6">
                  <h5 className="text-xl font-semibold text-text-yellow-accent mb-2 border-b border-border pb-1">
                    Pending Friend Requests ({myPendingRequests?.length || 0})
                  </h5>
                  {myPendingRequests === undefined ? (
                    <p className="text-muted-foreground">Loading requests...</p>
                  ) : myPendingRequests.length === 0 ? (
                    <p className="text-muted-foreground">No pending requests.</p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto bg-input p-3 rounded-md">
                      {myPendingRequests.map(req => (
                        <li key={req._id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigateToProfile(req.requesterId)}>
                            <img src={req.requesterImageUrl ?? '/blue-lock-logo-placeholder.png'} alt={req.requesterName} className="w-8 h-8 rounded-full object-cover" />
                            <span className="text-card-foreground">{req.requesterName}</span>
                          </div>
                          <div className="space-x-2">
                            <Button onClick={() => handleAcceptRequest(req._id)} size="sm" variant="primary">Accept</Button>
                            <Button onClick={() => handleDeclineRequest(req._id)} size="sm" variant="secondary">Decline</Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Blocked Users */}
                <div className="mt-6">
                  <h5 className="text-xl font-semibold text-destructive mb-2 border-b border-border pb-1">
                    Blocked Egoists ({myBlockedUsers?.length || 0})
                  </h5>
                  {myBlockedUsers === undefined ? (
                    <p className="text-muted-foreground">Loading blocked list...</p>
                  ) : myBlockedUsers.length === 0 ? (
                    <p className="text-muted-foreground">You haven't blocked anyone.</p>
                  ) : (
                    <ul className="space-y-2 max-h-48 overflow-y-auto bg-input p-3 rounded-md">
                      {myBlockedUsers.map(user => (
                        <li key={user._id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigateToProfile(user._id)}>
                            <img src={user.profileImageUrl ?? '/blue-lock-logo-placeholder.png'} alt={user.displayName ?? 'Blocked'} className="w-8 h-8 rounded-full object-cover" />
                            <span className="text-card-foreground">{user.displayName ?? 'Unnamed Egoist'}</span>
                          </div>
                          <Button onClick={() => handleUnblockUser(user._id)} size="sm" variant="accent">Unblock</Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

                        <Button onClick={onClose} variant="secondary" className="w-full mt-6">Close</Button>
                        </div>
                      )}
                    </Modal>
              
                    {/* Report Modal */}
                    {showReportModal && userId && profileData && !viewingOwnProfile && (
                      <ReportUserModal
                        isOpen={showReportModal}
                        onClose={() => setShowReportModal(false)}
                        reportedUserId={userId}
                        reportedUserName={profileData.displayName || "Selected User"}
                      />
                    )}
              
                    {/* Invite to Party Modal */}
                    {showInviteModal && userId && profileData && !viewingOwnProfile && friendshipStatus?.status === "accepted" && (
                      <Modal
                        isOpen={showInviteModal}
                        onClose={() => setShowInviteModal(false)}
                        title={`Invite ${profileData.displayName || "this user"} to Party`}
                        size="md"
                      >
                        <div className="space-y-4">
                          {(!myCreatedMatches || myCreatedMatches.length === 0) &&
                            (!myJoinedMatches || myJoinedMatches.length === 0) ? (
                            <div className="text-center py-8">
                              <p className="text-muted-foreground mb-4">No available parties to invite to.</p>
                              <p className="text-sm text-muted-foreground">Create a new party or join one to invite friends.</p>
                            </div>
                          ) : (
                            <div>
                              <p className="text-sm text-muted-foreground mb-4">
                                Select a party to invite <strong>{profileData.displayName || "this user"}</strong> to:
                              </p>
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {myCreatedMatches?.filter(m => m.status === "open" || m.status === "full").map(match => (
                                  <div
                                    key={match._id}
                                    className="p-3 border border-border rounded-md bg-input hover:bg-muted cursor-pointer transition-colors"
                                    onClick={() => handleInviteToParty(match._id)}
                                  >
                                    <h4 className="font-semibold text-primary">
                                      {match.partyName || "Unnamed Party"}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(match.dateTime).toLocaleDateString()} – {match.participantCount}/{match.playersNeeded} players
                                    </p>
                                    <p className="text-xs text-accent">You created this party</p>
                                  </div>
                                ))}
                                {myJoinedMatches?.filter(m => m.status === "open" || m.status === "full").map(match => (
                                  <div
                                    key={match._id}
                                    className="p-3 border border-border rounded-md bg-input hover:bg-muted cursor-pointer transition-colors"
                                    onClick={() => handleInviteToParty(match._id)}
                                  >
                                    <h4 className="font-semibold text-primary">
                                      {match.partyName || "Unnamed Party"}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {new Date(match.dateTime).toLocaleDateString()} – {match.participantCount}/{match.playersNeeded} players
                                    </p>
                                    <p className="text-xs text-secondary">You joined this party</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Modal>
                    )}
                  </>
                );
              }
