export type AccessTokenPayload = {
  sub: string;
  email: string;
  typ: 'access';
};

export type RefreshTokenPayload = {
  sub: string;
  typ: 'refresh';
};
