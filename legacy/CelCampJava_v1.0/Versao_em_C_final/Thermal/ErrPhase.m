PP=1:final;
figure; plot(PP, EPEy, '+-', PP, EPEz, '+-', PP, EPHx ,'+-');
maxEP=max(EPEy);
if (maxEP < max(EPEz)) maxEP = max(EPEz); end
if (maxEP < max(EPHx)) maxEP = max(EPHx); end
legend ('ErrPhase Ey', 'ErrPhase Ez', 'ErrPhase Hx'); axis([inicial final 0 maxEP]);
xlabel('Point');
ylabel('Error in degrees');