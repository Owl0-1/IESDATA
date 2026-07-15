export type AccessTokenPayload = {
  sub: string;
  email: string;
  typ: 'access';
  ver: number;
};

export type RefreshTokenPayload = {
  sub: string;
  typ: 'refresh';
  ver: number;
};
